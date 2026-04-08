import "../src/load-env.js";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

async function main() {
  await prisma.like.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.tweet.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const hash = await argon2.hash(PASSWORD);

  const users = await Promise.all(
    [
      { email: "alice@example.com", username: "alice", bio: "Building things." },
      { email: "bob@example.com", username: "bob", bio: "Coffee and code." },
      { email: "carol@example.com", username: "carol", bio: "Design + engineering." },
      { email: "dave@example.com", username: "dave", bio: "SRE vibes." },
      { email: "erin@example.com", username: "erin", bio: "Product & craft." },
      { email: "frank@example.com", username: "frank", bio: "Opinions my own." },
      { email: "grace@example.com", username: "grace", bio: "Reading the timeline." },
      { email: "henry@example.com", username: "henry", bio: "Minimalist tweets." },
      { email: "ivy@example.com", username: "ivy", bio: "Weekend hacker." },
      { email: "jack@example.com", username: "jack", bio: "Seeding data all day." },
      { email: "kate@example.com", username: "kate", bio: "One more bonus user." },
    ].map((u) =>
      prisma.user.create({
        data: {
          email: u.email,
          username: u.username,
          passwordHash: hash,
          bio: u.bio,
        },
      })
    )
  );

  const tweets: { authorIdx: number; content: string }[] = [];
  for (let i = 0; i < users.length; i++) {
    tweets.push({
      authorIdx: i,
      content: `Hello from ${users[i].username}! Kicking off the timeline — post ${i + 1}.`,
    });
    tweets.push({
      authorIdx: (i + 3) % users.length,
      content: `Cross-pollination: ${users[(i + 3) % users.length].username} chiming in thread ${i}.`,
    });
  }

  const createdTweets = await Promise.all(
    tweets.map((t) =>
      prisma.tweet.create({
        data: { authorId: users[t.authorIdx].id, content: t.content.slice(0, 280) },
      })
    )
  );

  const followPairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
    [1, 3],
    [2, 4],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 0],
    [2, 0],
    [5, 1],
  ];

  for (const [a, b] of followPairs) {
    if (a === b) continue;
    await prisma.follow.create({
      data: { followerId: users[a].id, followingId: users[b].id },
    }).catch(() => undefined);
  }

  const likeOps: { userIdx: number; tweetIdx: number }[] = [
    { userIdx: 0, tweetIdx: 0 },
    { userIdx: 1, tweetIdx: 0 },
    { userIdx: 2, tweetIdx: 1 },
    { userIdx: 3, tweetIdx: 2 },
    { userIdx: 4, tweetIdx: 3 },
    { userIdx: 0, tweetIdx: 5 },
    { userIdx: 6, tweetIdx: 4 },
    { userIdx: 7, tweetIdx: 6 },
    { userIdx: 8, tweetIdx: 7 },
    { userIdx: 9, tweetIdx: 8 },
    { userIdx: 10, tweetIdx: 9 },
  ];

  for (const { userIdx, tweetIdx } of likeOps) {
    const tw = createdTweets[tweetIdx];
    if (!tw) continue;
    await prisma.like
      .create({
        data: { userId: users[userIdx].id, tweetId: tw.id },
      })
      .catch(() => undefined);
  }

  // Demo credentials documented in README
  // eslint-disable-next-line no-console
  console.log("Seed complete. Demo login: alice@example.com / Password123!");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
