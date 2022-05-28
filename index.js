#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import { cli } from 'cleye';
import path from 'path';
import fs from 'fs';

// parse args
export const argv = cli({
  name: "ytsave",

  parameters: [
    '[video]' // the video to download
  ],

  // options
  flags: {
    "enable-ytdl-warnings": {
      type: Boolean,
      description: "Enable warnings from ytdl-core",
      default: false
    },

    "output-dir": {
      type: String,
      description: "The output directory to save the video to",
      default: ".",
      alias: "o"
    },

    "yes": {
      type: Boolean,
      description: "Automatically say yes to any prompts",
      default: false,
      alias: "y"
    },

    "playlist-limit": {
      type: Number,
      description: "The maximum number of videos to download from a playlist (-1 for no limit)",
      default: -1,
      alias: "l"
    }
  }
});

// unless user wants to see if ytdl has an update, we can skip the update check
process.env.YTDL_NO_UPDATE = process.env.YTDL_NO_UPDATE ?? argv.flags['enable-ytdl-warnings'] ?? false;

// check if output dir exists
export const outputDir = path.resolve(process.cwd(), argv.flags['output-dir']);
if (!fs.existsSync(outputDir)) {
  const { 
    create
  } = argv.flags.yes ? {
    create: "y"
  } : await inquirer.prompt({
    name: 'create',
    type: 'input',
    message: chalk.yellow('Output directory does not exist! Would you like to create it? [Y/n]'),
  });

  if (create.toLowerCase() === 'y') {
    fs.mkdirSync(outputDir);
  } else {
    process.exit(1);
  }
}

async function boot() {
  console.log(`
      ${chalk.bgBlue('HOW TO USE')} 
      Provide a YouTube Video URL in the input box when prompted,
      The video will then be downloaded and saved into the output folder.
      
      ${chalk.yellow('🌟 Please give the repository a star if you find this useful!')}
    `);
  const answers = await inquirer.prompt({
    name: 'url',
    type: 'input',
    message: 'Please provide a YouTube video URL.',
    default() {
      return 'Example: youtu.be/dQw4w9WgXcQ';
    }
  })

  return answers.url
}


import { handleDownloadFromUserInput } from './handlers/download.js';

if (argv._.video) {
  handleDownloadFromUserInput(argv._.video);
} else {
  const video = await boot();
  handleDownloadFromUserInput(video);
}