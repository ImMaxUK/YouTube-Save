#!/usr/bin/env node

import chalk from 'chalk'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'
import ytdl from 'ytdl-core';
import fs from 'fs'
import cliProgress from 'cli-progress'
import dotenv from 'dotenv'

process.env.YTDL_NO_UPDATE = false

let video
let spinner
let bar

const options = {
  format: 'mp3',
  quality: 'highestaudio',
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
  
  const videoData = await ytdl.getBasicInfo(`https://www.youtube.com/watch?v=${video}`);
  const stream = await ytdl(video, options)

  console.log(chalk.bgGreen('OK') + ' Downloading requested video(s)...')

  var fileName = videoData.videoDetails.title.replace(/[/\\?%*:|"<>]/g, '-') + '.mp3';

  stream.pipe(fs.createWriteStream(`${process.cwd()}/${fileName}`))

  const bar = new cliProgress.SingleBar({ format: ` ${chalk.greenBright('»')} \u001b[35m{bar}\u001b[0m {percentage}% - ${videoData.videoDetails.title}`, barCompleteChar: '━', barIncompleteChar: '━', barGlue: '\u001b[0m', fps: 10 }, cliProgress.Presets.shades_classic);
  
  stream.on('info', () => {
    bar.start(100, 0)
  })
  stream.on('progress', (info, a, b) => {
    bar.update(Math.floor((a / b) * 100))
  })
  stream.on('end', () => {
    bar.stop()
    console.log(chalk.green('✓') + ' Successfully saved video(s) to ' + chalk.green(`${process.cwd()}`))
  })

}

if (process.argv[2]) {
  video = process.argv[2]
  await dlVideo()
} else {
  await boot()
  await dlVideo()
}