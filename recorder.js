// importing neccessary modules and packages
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

// parsing string of time to delta time
function parseTimeToMs(timeStr) {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return (minutes * 60 + seconds) * 1000;
}

// screen recording with this
async function startBBBRecording(link) {
  
  // Launch puppeteer browser (Chromium)
  try{
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-accelerated-2d-canvas',
      '--disable-accelerated-video-decode',
      '--disable-accelerated-video-encode',
      '--disable-gpu-rasterization',
      '--disable-gl-drawing-for-tests',
      '--start-fullscreen',
    ],
  });


  
  const page = await browser.newPage();
  
  // the link that is selected to be recorded
  const bbbUrl = link;
  console.log('Opening BBB session...');

  await page.goto(bbbUrl);

    await new Promise(resolve => setTimeout(resolve, 10000)); // wait for 10 seconds for the page to load
    
    const timestring = await page.$eval("span.vjs-remaining-time-display", el => el.textContent.trim())
    const timeout = parseTimeToMs(timestring); // the delta time of the video that is supposed to be recorded

    // element injection for removing the cursor in the recording
    await page.evaluate(() => {

      const style = document.createElement("style");
      style.innerHTML = '* { cursor : none !important;}';
      document.head.appendChild(style)

    });

    // starting the vidoe
    await page.click("button.vjs-play-control");


  // Start ffmpeg recording process
  const ffmpegProcess = startRecording();

  console.log('Recording started. Join the BBB session and interact!');

  //timeout delta time variable instead of 15000 should be here
  await new Promise(resolve => setTimeout(resolve, 15000)); // this is for the recording to continue until the end of the video


  console.log('Stopping recording...');
  // Stop the ffmpeg process gracefully
  ffmpegProcess.stdin.write('q');

  // wait for the recording the end completely
  await new Promise(resolve => setTimeout(resolve,15000))


  // closing the browser
  await browser.close();

  console.log('Browser closed, recording stopped.');
  }
  catch(err){
    console.log(err);
  }
}

function startRecording() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  // change this to where the destination of the files should be and what the name of the file should be
  const outputFile = path.resolve(__dirname, `bbb_recording_${timestamp}.mp4`);

  const platform = os.platform();

  let ffmpegArgs;

  if (platform === 'win32') {
    
    // Run 'ffmpeg -list_devices true -f dshow -i dummy' to find audio device names

    ffmpegArgs = [
      '-y',
      '-f', 'dshow',
      '-i', 'audio=CABLE Output (VB-Audio Virtual Cable)',  // <-- Change if needed
      '-f', 'gdigrab',
      '-framerate', '30',
      // '-i', 'title=Playback - Google Chrome for Testing', // for only getting the chrome title
      '-i','desktop', // for getting the entire desktop
      '-c:v', 'libx264',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputFile,
    ];
  } else if (platform === 'linux') {
    // Linux: Change display and audio device accordingly

    ffmpegArgs = [
      '-y',
      '-f', 'x11grab', // for linux video device recording
      '-s', '1920x1080',  // screen resolution - adjust to your screen
      '-i', ':0.0',
      '-f', 'pulse', // for linux audio device recording
      '-i', 'default',
      '-c:v', 'libx264',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-r', '30',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputFile,
    ];
  } else {
    throw new Error('Unsupported OS platform for recording');
  }

  console.log('Running ffmpeg with args:', ffmpegArgs.join(' '));

  // creating an ffmpeg object for recording
  const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

  // closing the ffmpeg recording gracefully
  ffmpeg.on('exit', (code, signal) => {
    console.log(`ffmpeg exited with code ${code} and signal ${signal}`);
  });

  // returning the ffmpeg object accordingly
  return ffmpeg;
}
// exporting the recorder to be used by the server
module.exports = {startBBBRecording};
