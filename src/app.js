import express from "express"
import cors from "cors"
import cookiParser from "cookie-parser"

const app=express()

app.use(cors({
    origin: process.env.CORS_ORIGEN,
    credentials: true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookiParser())

//routes
import userRouter from "./routes/user.route.js"

//route declaration
app.use("/api/v1/users", userRouter)

export { app }