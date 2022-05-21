#!/usr/bin/env node

import chalk from 'chalk'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'
import Innertube from 'youtubei.js'
import fs from 'fs'
import path from 'path';
import { fileURLToPath } from 'url';

let video
let spinner

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const youtube = await new Innertube();

const options = {
  format: 'mp4',
  type: 'audio',
};

const sleep = (ms = 2000) => new Promise(r => setTimeout(r, ms))

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

  video = answers.url
}

async function dlVideo() {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?/;
  const match = video.match(regex);
  try {
    video = match[1];
  } catch (err) {
    return console.log(chalk.bgRed('ERR') + ' Invalid URL! Please retry with a YouTube URL.')
  }

  const details = await youtube.getDetails(video)
  details.title = details.title.replace(/[/\\?%*:|"<>]/g, '-');

  const stream = youtube.download(video, options)
    
  stream.pipe(fs.createWriteStream(`./${details.title}.mp3`))

  stream.on('info', () => {
    spinner = createSpinner(`Downloading ${video}...`)
    spinner.start()
  })
  stream.on('progress', (info) => {
    spinner.update({ text: `Downloading ${video}... (${info.percentage}% complete)` })
  })
  stream.on('end', () => {
    spinner.success({ text: `Downloaded ${video}. File saved as ${details.title}.mp3` })
  })

}

if (process.argv[2]) {
  video = process.argv[2]
  await dlVideo()
} else {
  await boot()
  await dlVideo()
}