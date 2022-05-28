import { createSpinner } from 'nanospinner'
import ytdl from 'ytdl-core';
import fs from 'fs'
import cliProgress from 'cli-progress'
import VideoEventEmitter from '../utils/VideoEventEmitter.js';
import chalk from 'chalk';
import path from 'path';
import { outputDir, argv } from "../index.js"
import ytpl from 'ytpl';

/** @type {ytdl.downloadOptions} */
const options = {
  format: "mp3",
  quality: "highestaudio",
};

// THIS FUNCTION IS PURPOSELY NOT ASYNC
export function dlVideo(url) {
  // use an event emitter to handle the progress of the download
  // this function is meant to download the video, not download and provide user with a progress bar
  // let the wrapper function handle the progress bar (so it can deal with playlists too)

  /** @type {import("../utils/VideoVideoEmitter").default} for some reason .d.ts wont actually change the imported type */ 
  const eventEmitter = new VideoEventEmitter();

  // run the download asynchronously, we want to return the event emitter asap
  (async () => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?/; // match youtube video id
    const match = url.match(regex); // get the video id

    // if the video id is not found, throw an error
    if(!match || !match[1]) return eventEmitter.emit('finish', false, chalk.bgRed('ERR') + ' Invalid URL! Please retry with a YouTube URL.');
    const video = match[1];
    
    // get basic info about the video and start the download
    const videoData = await ytdl.getBasicInfo(`https://www.youtube.com/watch?v=${video}`);
    const stream = ytdl(video, options);
  
    // remove special characters from the title
    var fileName = videoData.videoDetails.title.replace(/[/\\?%*:|"<>]/g, '-') + '.mp3';
  
    // start file download
    stream.pipe(fs.createWriteStream(path.resolve(outputDir, fileName)));

    // pass some events to the event emitter
    stream.on('info',     ()           => eventEmitter.emit('start', videoData));
    stream.on('progress', (info, a, b) => eventEmitter.emit("progress", videoData, a, b));
    stream.on('end',      ()           => eventEmitter.emit('finish', true, path.resolve(outputDir, fileName)));
  })();

  // return the event emitter
  return eventEmitter;
}

/**
 * @param {string} url
 */
export async function handleDownloadFromUserInput(url) {
  // validate the url
  const isValidYoutubeURL = /^https?\:\/\/(?:www\.youtube(?:\-nocookie)?\.com\/|m\.youtube\.com\/|youtube\.com\/)?(?:ytscreeningroom\?vi?=|youtu\.be\/|vi?\/|user\/.+\/u\/\w{1,2}\/|embed\/|watch\?(?:.*\&)?vi?=|\&vi?=|\?(?:.*\&)?vi?=)([^#\&\?\n\/<>\"']*)/.test(url);
  if(!isValidYoutubeURL) return console.log(chalk.bgRed('ERR') + ' Invalid URL! Please retry with a YouTube URL.');

  // check if the url is a playlist
  const isPlaylist = /^.*(youtu.be\/|list=)([^#\&\?]*).*/.test(url);
  
  // create a loading spinner so the user knows something is happening
  const spinner = createSpinner(isPlaylist ? `Collecting playlist videos...` : "Preparing to download...").start();

  if(isPlaylist) {
    // PLAYLIST LOGIC

    // get the playlist data
    const playlist = await ytpl(url, {
      limit: argv.flags['playlist-limit'] < 0 ? Infinity : argv.flags['playlist-limit']
    });
    
    // update spinner text
    spinner.update({
      text: `Downloading ${playlist.items.length} videos...`
    });

    // create a multibar progress bar
    const bars = new cliProgress.MultiBar({
      format: ` ${chalk.greenBright('»')} \u001b[35m{bar}\u001b[0m {percentage}% - {filename}`, barCompleteChar: '━', barIncompleteChar: '━', barGlue: '\u001b[0m',
      fps: 10,
      barCompleteChar: '━',
      barIncompleteChar: '━',
      barGlue: '\u001b[0m',
    }, cliProgress.Presets.shades_classic);

    // keep track of which are still downloading
    const progresses = new Set(playlist.items.map(i => i.id));

    for(const video of playlist.items) {
      const progress = dlVideo(video.url); // download the video
      const bar      = bars.create(100, 0, { filename: video.title }); // and create a bar
      
      // update the bar when the progress event is emitted
      progress.on('progress', (_, a, b) => {
        const p = (a / b) * 100;
        bar.update(p);
      });

      // when the download is finished, remove the bar
      progress.on('finish', (success, message) => {
        bar.stop();
        if(!success) console.log(message);

        progresses.delete(video.id);
      });
    }

    // wait for all downloads to finish
    await new Promise(r => {
      const interval = setInterval(() => {
        if(progresses.size === 0) {
          clearInterval(interval);
          r();
        }
      }, 1000);
    });

    // stop the spinner
    spinner.success({
      text: `Finished downloading ${playlist.items.length} videos!`
    });
 
    // stop bar
    bars.stop();

    // and we're done!
    console.log(chalk.bgGreen('OK') + ' Successfully saved video(s) to ' + chalk.green(`"${outputDir}"`));
  } else {
    // download just one video

    const progress = dlVideo(url); // download the video
    const bar      = new cliProgress.SingleBar({
      format: ` ${chalk.greenBright('»')} \u001b[35m{bar}\u001b[0m {percentage}% - {filename}`, barCompleteChar: '━', barIncompleteChar: '━', barGlue: '\u001b[0m',
      fps: 10,
      barCompleteChar: '━',
      barIncompleteChar: '━',
      barGlue: '\u001b[0m',
    }, cliProgress.Presets.shades_classic); // create a single bar

    /** @type {ytdl.videoInfo | undefined} */
    var data;

    progress.on('start', videoInfo => {
      spinner.stop();
      data = videoInfo;

      // start the bar when the start event is emitted
      bar.start(100, 0, { filename: videoInfo.videoDetails.title }); 
    });

    // update the bar when the progress event is emitted
    progress.on('progress', (_, a, b) => {
      const p = (a / b) * 100;
      bar.update(p);
    });

    // when the download is finished, stop the bar
    progress.on('finish', (success, message) => {
      bar.stop();
      if(!success) console.log(message);

      if(success) {
        // stop the spinner
        spinner.success({
          text: `Finished downloading ${data?.videoDetails.title ?? "Unknown"}!`
        });

        // and we're done!
        console.log(chalk.bgGreen('OK') + ' Successfully saved video to ' + chalk.green(`"${message}"`));
      }
    });
  }
}