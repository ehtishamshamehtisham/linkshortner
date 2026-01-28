# Premium URL Shortener - Run Guide

This project consists of a Node.js/Express backend that also serves the static frontend files.

## Prerequisites
1.  **Node.js**: Ensure Node.js is installed.
2.  **MongoDB**: You need a running MongoDB instance.
    - If you have MongoDB installed locally, make sure it's running.
    - Default URI: `mongodb://localhost:27017/premium-shortener`

## Setup & Run

1.  **Navigate to the backend directory**:
    ```bash
    cd premium-shortener/backend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Start the Server**:
    ```bash
    npm start
    ```
    - The server will start on port `5500` by default.
    - You should see "MongoDB Connected" in the console if the database connection is successful.

4.  **Access the Application**:
    - Open your browser and go to: [http://localhost:5500](http://localhost:5500)
    - **Note**: The frontend is served automatically by the backend. You do **not** need to run a separate frontend server.

## Configuration (Optional)
You can create a `.env` file in the `backend` folder to override defaults:
```env
PORT=5500
MONGO_URI=mongodb://localhost:27017/premium-shortener
JWT_SECRET=your_secure_secret
```
