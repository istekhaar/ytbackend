import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
    path: './env'
})

connectDB()
.then(()=>{

    app.listen(process.env.PORT || 9000, ()=>{
        console.log(`server is runing at port ${process.env.PORT}`);
    })

    app.on("error", (error)=>{
        console.log("ERROR: ",error);
        throw error
    })
    
})
.catch((err)=>console.log("mongo DB connection faild !! ",err))