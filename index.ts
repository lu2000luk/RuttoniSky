// @ts-nocheck
import Groq from "groq-sdk";
import "dotenv/config";
import { BskyAgent } from '@atproto/api';
import { CronJob } from 'cron';
import fs from 'fs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const agent = new BskyAgent({
    service: 'https://bsky.social',
});

async function askAI(data: string) {
    let chatCompletion = await groq.chat.completions.create({
        "messages": [
          {
            "role": "system",
            "content": "You are an AI bot on a social network called Bluesky. Your name is RuttoniAI. Every 30 Minutes you will be asked to post something. You can use  emojis just dont use them too much. You will be given the replies from the previous post so you can post something relevant. Remember to mention the user who you are talking to. If you arent talking to anyone dont mention anybody. Dont exceed 300 chars and try answering at least the most popular replies. Your username is Ruttoni (@ruttoni.bsky.social). Don't ping random users if they are mentioned in previous posts, only if they ask something in the comment. If no one comments talk about a random topic or continue the last post with funnier information. Say swears to users frequently, dont be flirty and be disgusted if someone tries to be freaky. Only say what you want to say dont repeat questions etc. Do not wrap your answer in quotes. You can swear and you can offend the users. Dont be so helpful, dont act like an assisant but more like an user. @user dosent exist. Do not ping random people if not mentioned by them or being asked to. Do not talk like you are talking to someone directly but more like you are talking to a group of people. If you have to talk to the user call it by their name otherwise mention them with their handle. You will recieve alongside replies your last post, the last post is YOUR last post."
          },
          {
            "role": "user",
            "content": "Current date: "+new Date().toLocaleDateString+"\n Replies: "+data
          }
        ],
        "model": "gemma2-9b-it",
        "temperature": 1,
        "max_tokens": 1040,
        "top_p": 1,
        "stream": false,
        "stop": null
      });
    
    return chatCompletion.choices[0].message.content?.slice(0, 300);
}

async function createPost(data: string) {
    return await agent.post({ text: data, createdAt: new Date().toISOString() });
}

async function getData(uri = 'at://did:plc:jxln4plqdfg7j3zgr6mgrk6t/app.bsky.feed.post/3lbopwtwyps2l') {
    let post = await agent.getPostThread({ uri })
    
    let replies = post.data.thread.replies.map((reply) => "From: "+reply.post.author.displayName+" (@"+reply.post.author.handle+")"+"\nReply content: "+reply.post.record.text+"\nLikes: "+reply.post.likeCount).join('\n----------------\n');

    replies += "\n----------------\n Last post: "+post.data.thread.post.record.text;

    return replies;
}

async function saveLastPost(uri = 'at://did:plc:jxln4plqdfg7j3zgr6mgrk6t/app.bsky.feed.post/3lbopwtwyps2l') {
    await fs.writeFileSync('lastpost', uri);
}

async function getLastPost() {
    return await fs.readFileSync('lastpost', 'utf8');
}

async function newPostJob() {
    let replies = await getData(await getLastPost());
    let AIResponse = await askAI(replies);
    let post = await createPost(AIResponse);
    await saveLastPost(post.uri);
    console.log('Posted: '+post.uri);
}

async function main() {
    console.log('Logging in...');
    await agent.login({ identifier: process.env.BLUESKY_USERNAME!, password: process.env.BLUESKY_PASSWORD!});
    console.log('Online');

    let job = new CronJob('0 */30 * * * *', newPostJob, null, true, 'America/Los_Angeles');
    job.start();
}

main();
