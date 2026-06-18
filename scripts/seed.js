/* eslint-disable no-console */
'use strict';

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../models/user');
const Book = require('../models/book');
const Reviewer = require('../models/reviewer');

const MONGOOSE_URI = process.env.MONGOOSE_CONNECTION_STRING;

if (!MONGOOSE_URI || !MONGOOSE_URI.toLowerCase().includes('localhost')) {
  console.error('Seed aborted: MONGOOSE_CONNECTION_STRING must point to a localhost database.');
  process.exit(1);
}

const genres = ['ADV', 'BIO', 'CIF', 'CRI', 'ERO', 'FAN', 'FCH', 'JUV', 'HIF', 'HUM', 'POE', 'POL', 'PSD', 'ROM', 'SUS', 'TER', 'THR'];
const genreNames = ['adventure', 'biography', 'cienceFiction', 'crime', 'erotica', 'fantasy', 'forChildren', 'juvenile', 'historicalFiction', 'humor', 'poetry', 'policial', 'psychologicalDrama', 'romantic', 'suspense', 'terror', 'thriller'];
const formats = ['Paperback', 'Hardcover', 'eBook', 'Audiobook'];
const editorials = ['Penguin Random House', 'HarperCollins', 'Simon & Schuster', 'Hachette', 'Macmillan', 'Planeta', 'Anagrama', 'Alfaguara'];
const countries = ['Spain', 'Mexico', 'Argentina', 'Colombia', 'USA', 'France', 'Germany', 'UK'];

const firstNames = ['Alice', 'Bob', 'Carlos', 'Diana', 'Elena', 'Fran', 'Gabriel', 'Hannah', 'Ivan', 'Julia'];
const lastNames = ['Smith', 'García', 'López', 'Martínez', 'Fernández', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis'];

const bookTitles = [
  'The Forgotten Path', 'Echoes of Tomorrow', 'Shadows in the Dark', 'The Last Horizon',
  'Whispers of the Sea', 'Beyond the Stars', 'The Crimson Door', 'Lost in Time',
  'The Silent Garden', 'Voices from Afar', 'The Iron Crown', 'A Distant Light',
  'Children of the Storm', 'The Amber City', 'Dreams of Fire',
];

const synopses = [
  'A gripping tale of survival and redemption set against a breathtaking landscape.',
  'An unexpected journey that challenges everything the protagonist believed to be true.',
  'A masterfully crafted story of love, loss, and the enduring power of hope.',
  'A dark and compelling narrative that keeps you guessing until the very last page.',
  'An epic adventure across uncharted territories, full of wonder and danger.',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, min = 1, max = 3) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seed() {
  await mongoose.connect(MONGOOSE_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
  });
  console.log('Connected to MongoDB:', mongoose.connection.name);

  // Wipe existing seed data
  await Promise.all([User.deleteMany({}), Book.deleteMany({}), Reviewer.deleteMany({})]);
  console.log('Cleared existing data.');

  // Create users
  const hashedPassword = await bcrypt.hash('Password123!', 14);
  const userData = Array.from({ length: 10 }, (_, i) => {
    const name = firstNames[i];
    const lastName = pick(lastNames);
    return {
      name,
      lastName,
      email: `${name.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      password: hashedPassword,
      country: pick(countries),
      avatar: `https://i.pravatar.cc/150?u=${i}`,
    };
  });

  const users = await User.insertMany(userData);
  console.log(`Created ${users.length} users.`);

  // Create books (each owned by a random user)
  const bookData = bookTitles.map((title) => ({
    title,
    author: pick(users)._id,
    editorial: pick(editorials),
    synopsis: pick(synopses),
    genre: pick(genres),
    cover: `https://picsum.photos/seed/${encodeURIComponent(title)}/200/300`,
    pages: randomInt(150, 900),
    datePublished: randomDate(new Date('2000-01-01'), new Date()),
    formats: pickMany(formats),
    copies: randomInt(0, 500),
    freePromoAvailable: Math.random() > 0.5,
    reviewersOrders: [],
  }));

  const books = await Book.insertMany(bookData);
  console.log(`Created ${books.length} books.`);

  // Create reviewers (one per user, not all users need to be reviewers)
  const reviewerUsers = users.slice(0, 6);
  const reviewerData = reviewerUsers.map((user, i) => ({
    author: user._id,
    description: `Book reviewer passionate about ${pick(genreNames)} and ${pick(genreNames)}.`,
    genres: pickMany(genreNames, 1, 4),
    formats: pickMany(formats, 1, 3),
    blog: i % 2 === 0 ? { url: `https://blog${i}.example.com`, name: `${user.name}'s Book Blog` } : {},
    booktube: i % 3 === 0 ? { url: `https://youtube.com/channel/${i}`, name: `${user.name}Reads` } : {},
    bookstagram: i % 2 === 1 ? { url: `https://instagram.com/books${i}`, name: `@${user.name.toLowerCase()}reads` } : {},
    goodreads: { url: `https://goodreads.com/user/${user._id}`, name: user.name },
    amazon: i % 4 === 0 ? { url: `https://amazon.com/profile/${i}`, name: `${user.name} Reviews` } : {},
  }));

  const reviewers = await Reviewer.insertMany(reviewerData);
  console.log(`Created ${reviewers.length} reviewers.`);

  console.log('\n--- Seed complete ---');
  console.log('Sample login credentials:');
  users.slice(0, 3).forEach((u) => console.log(`  ${u.email}  /  Password123!`));

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
