# Official Bun image
FROM oven/bun:1 AS base

# Set the working directory
WORKDIR /usr/src/app

# Copy all files
COPY . .

# Install dependencies
RUN bun install

# Run the application
CMD [ "bun", "run", "index.ts" ]