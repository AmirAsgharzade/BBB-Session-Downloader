require('dotenv').config()
const express = require('express')
const {startBBBRecording} = require("./recorder")
const path = require('path')
const { Pool } = require('pg');
const Queue  = require('./queue')

const queue = new Queue()

const app = express();
port = 3000;

app.use(express.urlencoded({extended: true}));
app.use(express.json());

const pool = new Pool({

    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
});


app.get('/session-downloader',async (req,res) =>{

    res.sendFile(path.join(__dirname,'templates','index.html'))

});

app.post('/session-downloader',async (req,res) =>{

    const {url} = req.body;

    try{
        // const result = await pool.query("SELECT id,link FROM session_urls WHERE link like $1",[url]);
        // if (result.rows.length === 0 ){
            
            const id = await pool.query("INSERT INTO session_urls(link,status) VALUES ($1,$2) RETURNING id",[url,"in queue"]);
            console.log(id.rows[0].id)
            queue.enqueue(id.rows[0].id);
            
            res.send(`Success! your link is now in our queue.`)
        // }
        // else{
        //     console.log("the link has already been added to the database")
        //     res.send("the link you provided is Already processed")
        // }
        
    }catch(error){
        console.error(error)
        res.status(500).send('an error occurred while submitting the url');
    }

} )

app.listen(port, ()=>{
    console.log(`Server running at http://localhost:${port}`);
});

const processURLQueue = async () =>{

    if (queue.isEmpty()){
        console.log("Queue is empty, waiting...");
        setTimeout(processURLQueue,5000);
        return;
    }
    try{

        
    const linkid = queue.peek();
    console.log(linkid)
        if (linkid !== null){
            const result = await pool.query("SELECT link FROM session_urls WHERE id=$1", [linkid])
            // console.log("testing")
            // console.log(result)
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

processURLQueue()