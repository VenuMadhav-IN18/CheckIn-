const mysql=require('mysql2');
const db=mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'StrongPass123!',
    database:'checkIn'
});
db.connect((err)=>{
    if(err){
        console.log("Failed to connect");
        return;
    }
    console.log("Connected to Database");
});
module.exports=db;