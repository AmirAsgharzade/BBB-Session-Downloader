const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');


function parseTimeToMs(timeStr) {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return (minutes * 60 + seconds) * 1000;
}

async function startBBBRecording() {
  // Launch puppeteer browser (Chromium)


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

  // Replace with your actual BBB meeting URL
  const bbbUrl = 'https://sky.webinaronline.ir/playback/presentation/2.3/023c21c182db3cdb4b3d5eb7781b6ff62fd533b2-1745817640964';

  console.log('Opening BBB session...');
  await page.goto(bbbUrl);

  // Wait some seconds for the BBB session to fully load
//   await page.waitForTimeout(10000);
    await new Promise(resolve => setTimeout(resolve, 10000)); // wait for 3 seconds
    
    const timestring = await page.$eval("span.vjs-remaining-time-display", el => el.textContent.trim())
    const timeout = parseTimeToMs(timestring);

    page.evaluate(() => {

      const style = document.createElement("style");
      style.innerHTML = '* { cursor : none !important;}';
      document.head.appendChild(style)

    });
    page.click("button.vjs-play-control");


  // Start ffmpeg recording process
  const ffmpegProcess = startRecording();

  console.log('Recording started. Join the BBB session and interact!');

  // Let the recording run for 1 hour or until you manually stop the script
//   await page.waitForTimeout(60 * 60 * 1000);
  console.log(timeout,timestring)
  await new Promise(resolve => setTimeout(resolve, 15000000)); // wait for 3 seconds


  console.log('Stopping recording...');
  // Stop the ffmpeg process gracefully
  ffmpegProcess.kill('SIGINT');

  await browser.close();

  console.log('Browser closed, recording stopped.');
}

function startRecording() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.resolve(__dirname, `bbb_recording_${timestamp}.mp4`);

  const platform = os.platform();

  let ffmpegArgs;

  if (platform === 'win32') {
    // Windows: adjust 'audio="device_name"' to your virtual audio device
    // Run 'ffmpeg -list_devices true -f dshow -i dummy' to find audio device names

    ffmpegArgs = [
      '-y',
      '-f', 'dshow',
      '-i', 'audio=CABLE Output (VB-Audio Virtual Cable)',  // <-- Change if needed
      '-f', 'gdigrab',
      '-framerate', '30',
      '-i', 'title=Playback - Google Chrome for Testing',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      outputFile,
    ];
  } else if (platform === 'linux') {
    // Linux: Change display and audio device accordingly

    ffmpegArgs = [
      '-y',
      '-f', 'x11grab',
      '-s', '1920x1080',  // screen resolution - adjust to your screen
      '-i', ':0.0',
      '-f', 'pulse',
      '-i', 'default',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-r', '30',
      '-c:a', 'aac',
      outputFile,
    ];
  } else {
    throw new Error('Unsupported OS platform for recording');
  }

  console.log('Running ffmpeg with args:', ffmpegArgs.join(' '));

  const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'inherit', 'inherit'] });

  ffmpeg.on('exit', (code, signal) => {
    console.log(`ffmpeg exited with code ${code} and signal ${signal}`);
  });

  return ffmpeg;
}

startBBBRecording().catch(console.error);
