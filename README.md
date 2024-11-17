# relay

formula electric order management system

## step one: setup database

1. on mac OS, in order to install postgresql, just run in your terminal:
``` brew install postgresql```

    follow instructions online for windows. 

2. then run:
```brew services start postgresql```

3. verify install by running:
```psql --version```

4. access the postgres shell as a default user:
```psql postgres```

    if you get a "command not found" error, you might need to add PostgreSQL to your PATH or use the full path to psql.

5. create a new db user:
```CREATE USER myuser WITH PASSWORD 'mypassword';```

    replace 'myuser' and 'mypassword' with whatever you want.

6. create a new database:
```CREATE DATABASE order_management_db OWNER myuser;```

7. grant needed perms:
```GRANT ALL PRIVILEGES ON DATABASE order_management_db TO myuser;```

    ```ALTER USER myuser CREATEDB;```

8. exit shell:
```\q```

## step two: setup environment variables

1. create a .env file in the root of the project

2. in the .env, add this line:
```DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/order_management_db?schema=public"```

    replace myuser, mypassword, and order_management_db with your actual database username, password, and name.

## step three: init prisma

1. run this from the terminal in the root of the project:
```npm install prisma @prisma/client```
```npm install ts-node typescript @types/node --save-dev```

2. same place:
```npx prisma init```

3. then:
```npx prisma generate```

    ```npx prisma migrate dev --name init```

4. same place, run:
```npm run seed```

    you should see:
```Database has been seeded. 🌱```

5. verify the db:
```npx prisma studio```

    this opens a web interface at http://localhost:5555. navigate through and make sure the data from seed.ts in the prisma folder is there. if so, all is good! if not, contact athul.

## setup google auth

1. go to google cloud (https://cloud.google.com/) navigate to “APIs & Services”

2. create a new project, enter info blah blah

3. on left hand bar, select “OAuth consent screen”
	- select “External”
	- fill out required blah blah

4. on left hand bar, select “Credentials”

	- select “ + Create Credentials” then “OAuth Client ID”
	- select “Web application”
	- fill out required blah blah

		- for “Authorized JavaScript Origins”, use the main page link 
			- ex. “http://localhost:3000” for local
		- for “Authorized redirect URIs”, use the above link and add “/api/auth/callback/google”
			- ex. “http://localhost:3000/api/auth/callback/google” for local

	- should give you clientID and client secret, place these in “.env”
		- “GOOGLE_CLIENT_ID=“…
		- “GOOGLE_CLIENT_SECRET=“…

5. now google stuff is done, so you need auth secrets and url

    - for NEXTAUTH_SECRET: if you have a "AUTH_SECRET" use that, otherwise generate a new one in terminal - run ```npx auth secret``` in terminal - this will create a ".env.local" with a secret, place in ".env"
        - "NEXTAUTH_SECRET=“…
    - for NEXTAUTH_URL: this is just the base root url for the site
        - ex. "http://localhost:3000" for local
        - "NEXTAUTH_URL=“…

6. now login should work :)

## setup email notifications

1. put the sender account email in the .env
    - EMAIL_USER="..."

2. login to google account settings (https://myaccount.google.com/)

3. search for "app passwords" and then create new app password
    - enter info blah blah, it will give you a 16 character password. put this in .env w/ the spaces
    - EMAIL_PASS="..."

4. put the website base url in the .env
    - ex. "http://localhost:3000" for local testing
    - NEXT_PUBLIC_BASE_URL="..."

5. to automate the hourly texts, add cron job in vercel.json
    - locate/create vercel.json (in root directory)
    - add the following:
    ``` 
    {
        "cron": [
            {
                "path": "/api/orders/sendText",
                "schedule": "0 * * * *"
            }
        ]
    }
    ```

6. should be all good to go :)
