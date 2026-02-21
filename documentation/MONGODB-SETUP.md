# MongoDB setup for Atract backend

The backend requires MongoDB. The terminal error:

```text
Error: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
```

means nothing is listening on port **27017** (MongoDB’s default). Fix it in one of these ways.

---

## Option 1: MongoDB Atlas (cloud, no local install)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account.
2. Create a free cluster and get the **connection string** (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/atract`).
3. In the project root, open **`backend/.env`** and set:
   ```env
   MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/atract?retryWrites=true&w=majority
   ```
   Replace `YOUR_USER`, `YOUR_PASSWORD`, and `YOUR_CLUSTER` with your values. If the password has special characters, URL-encode them.
4. Restart the backend: `cd backend && npm run dev`.

---

## Option 2: MongoDB installed locally (Windows)

1. **Install MongoDB Community Server**  
   - [Download](https://www.mongodb.com/try/download/community) the Windows MSI and run it.  
   - During setup, you can install **MongoDB as a Service** so it starts with Windows and listens on port 27017.

2. **If you did not install as a service**, start MongoDB manually once:
   - Open a terminal and run (default path):
     ```bash
     "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath C:\data\db
     ```
     Create `C:\data\db` first if it doesn’t exist. Adjust the path if your MongoDB version or install location is different.

3. **Set `MONGO_URI` in `backend/.env`** (if not already set):
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/atract
   ```

4. Restart the backend: `cd backend && npm run dev`.

You should see in the terminal: **`MongoDB Connected: ...`**. After that, the blogs page and other features that use the DB should work.
