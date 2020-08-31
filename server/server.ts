import * as express from "express";
import * as cors from "cors";
import * as dotenv from "dotenv";
import * as bodyParser from "body-parser";
import { google } from "googleapis";

const app = express();
const port = 8080;

dotenv.config();

const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirect: process.env.GOOGLE_CALLBACK_URL,
};

// Scopes: https://developers.google.com/identity/protocols/oauth2/scopes
const scope = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];

const auth = new google.auth.OAuth2(
  googleConfig.clientId,
  googleConfig.clientSecret,
  googleConfig.redirect
);

app.use(cors());
app.use(bodyParser.json({ type: "application/json", limit: "6mb" }));

app.locals.database = {
  access_token: "",
  refresh_token: "",
};

/*
 * Generate and get Google OAuth 2.0 login URL
 */
app.get("/gurl", async (_request, response, next) => {
  try {
    const url = auth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scope,
    });

    response.json(url);
  } catch (err) {
    console.log(err);
    next(err);
  }
});

/*
 * Fetch ten most recent events from user's primary calendar
 */
app.get("/events", async (_request, response, next) => {
  try {
    const calendar = google.calendar({ version: "v3", auth });

    const calendarResponse = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    response.json(calendarResponse.data.items);
  } catch (err) {
    console.log(err);
    next(err);
  }
});

/*
 * Handle the login e.g:
 * 1. Trade the authorization code for ID token, access token and refresh token
 * 2. Verify the ID token with Google
 * 3. Return the payload to the client
 */
app.post("/glogin", async (request, response, next) => {
  try {
    const code = request.body.code;

    const { tokens } = await auth.getToken(code);
    const idToken = tokens.id_token;

    console.log(tokens);

    app.locals.database = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };

    auth.setCredentials({
      refresh_token: tokens.access_token,
      access_token: tokens.refresh_token,
    });

    const ticket = await auth.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    response.json(payload);
  } catch (err) {
    console.log(err);
    next(err);
  }
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
