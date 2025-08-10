# VideoShare (CSC 317 Final Project)

**Author:** Aniket Soni  
**SFSU Email:** your@sfsu.edu  
**App URL:** http://localhost:3000

## What it does
- Sign up / Log in / Log out (sessions)
- Upload a video (MP4/MOV) + optional thumbnail
- Home shows thumbnails; view a post, like, and comment
- Search videos
- Profile shows “My posts” and lets me delete my own posts

## Run it locally
1) `npm install`  
2) `cp .env.example .env` and fill values  
3) `mysql -u <db_user> -p <db_name> < db/schema_all.sql`  
4) `npm run start` → open http://localhost:3000

## Notes
- Schema: `db/schema_all.sql`  
- Uploads: `public/uploads` (gitignored)
- Stack: Node.js, Express, Handlebars, MySQL
