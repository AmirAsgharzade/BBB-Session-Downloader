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
app.get('/Record-meeting',async (req,res) =>{

    res.sendFile(path.join(__dirname,'templates','index.html'))

});

// Handling the enque of the links
app.post('/Record-Meeting',async (req,res) =>{

    const {url} = req.body;

    try{    
            const id = await pool.query("INSERT INTO session_urls(link,status) VALUES ($1,$2) RETURNING id",[url,"in queue"]);

            queue.enqueue(id.rows[0].id);

            res.status(201).send({result:true,ID:id.rows[0].id})

    }catch(error){
        console.error(error)

        res.status(500).send({result:false,ID:null});
    }

} )


app.post("/Record-status", async (req,res) =>{

    const id = req.body.id
    

    const result = await pool.query('SELECT status FROM session_urls WHERE id=$1',[id])
    

    if (result.rows.length === 0){
        res.status(404).send({result:false,status:null})
    }else{
        res.status(200).send({result:true,status:result.rows[0].status})
    }

})


app.post('/get-recorded-file',async (req,res) =>{

    const id = req.body.id
    const result = await pool.query('SELECT link FROM session_urls WHERE id=$1',[id])
    dummy_url = 'Dummy url for downloading id'

    if (result.rows.length === 0){
        res.status(404).send({result:false,url:null})
    }else{
        res.status(200).send({result:true,url:dummy_url})
    }

})

app.delete('/delete-recorded-file',async (req,res) =>{
    const id = req.body.id;
    const result = await pool.query('DELETE FROM session_urls WHERE id=$1 RETURNING *',[id])

    if (result.rows.length === 0){
        res.status(404).send({result:false,deleted:null})
    }else{
        res.status(200).send({result:true,deleted:result.rows})
    }
})

app.post('/get-proccess-status',async (req,res) =>{
    const status = req.body.status

    if (status === 0 ){
        results = await pool.query('SELECT * FROM session_urls')
    }else{
        results = await pool.query('SELECT * FROM session_urls WHERE status=$1',[status])
    }

    if (results.rows.length === 0){
        res.status(404).send({result:false,results:'no results found with this stauts'})
    }else{
        res.status(200).send({result:true,results:results.rows})
    }


})

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