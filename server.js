// importing the required packages and modules
require('dotenv').config()
const express = require('express')
const {startBBBRecording} = require("./recorder")
const path = require('path')
const { Pool } = require('pg');
const Queue  = require('./queue')

//initializing the Queue
const queue = new Queue()
// the API application with it's port
const app = express();
port = 3000;

// making sure the app can parse the form and json data sent from the client
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// creating connection to the postgreSQL
const pool = new Pool({

    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
});

// index page
app.get('/session-downloader',async (req,res) =>{

    res.sendFile(path.join(__dirname,'templates','index.html'))

});

// Handling the enque of the links
app.post('/session-downloader',async (req,res) =>{

    const {url} = req.body;

    try{    
            const id = await pool.query("INSERT INTO session_urls(link,status) VALUES ($1,$2) RETURNING id",[url,"in queue"]);

            queue.enqueue(id.rows[0].id);

            res.status(201).send(`Success! your link is now in our queue.`)

    }catch(error){
        console.error(error)

        res.status(500).send('an error occurred while submitting the url');
    }

} )

// running the app
app.listen(port, ()=>{
    console.log(`Server running at http://localhost:${port}`);
});

// running the background task of processing every link in the queue
const processURLQueue = async () =>{

    if (queue.isEmpty()){
        console.log("Queue is empty, waiting...");
        setTimeout(processURLQueue,5000);
        return;
    }
    try{

        
    const linkid = queue.peek();
    if (linkid !== null){
        const result = await pool.query("SELECT link FROM session_urls WHERE id=$1", [linkid])
        if (result.rows.length == 0){
            console.log("link does not exist")
        }
        else{
            const link = result.rows[0].link;
            console.log('proccessing the link...');
            await pool.query("UPDATE session_urls SET status = $1 WHERE id = $2",["processing",linkid]);
            await startBBBRecording(link);
            await pool.query("UPDATE session_urls SET status = $1 WHERE id = $2",["processed",linkid]);                
            console.log("link is processed now")
            queue.dequeue()
            }
        }
    }catch(error){
        console.error('Error processing the link:',error);
        
    }
    setTimeout(processURLQueue,0);

};
// running the background task
processURLQueue()