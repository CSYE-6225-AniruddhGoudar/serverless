// import { v4 as uuidv4 } from 'uuid';
// import dotenv from 'dotenv';
// import pg from 'pg';
// const { Client } = pg;
// import { PubSub } from '@google-cloud/pubsub';
// import mailgun from 'mailgun-js';
// import { DataTypes, Sequelize } from "sequelize";

const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const pg = require('pg');
const { PubSub } = require('@google-cloud/pubsub');
const mailgun = require('mailgun-js');
const { DataTypes, Sequelize } = require('sequelize');


dotenv.config();

const mailgunApiKey = process.env.MAILGUN_API_KEY;
const mailgun_domain = process.env.DOMAIN_NAME; 
const fromemail_Mailgun = process.env.MAILGUN_FROM_EMAIL;
const verification_link = process.env.VERIFICATION_LINK;

const dbHost = process.env.DATABASE_HOST;
const dbDatabase = process.env.DATABASE_NAME; 
const dbUser = process.env.DATABASE_USER;
const dbPassword = process.env.DATABASE_PASSWORD;


console.log("dbHost ", dbHost);
console.log("dbUser ", dbUser);
 console.log("dbPassword ", dbPassword);
   console.log("dbDataverification_linkbase ", verification_link);


const databaseConnection = new Sequelize(dbDatabase, dbUser, dbPassword, {
host :dbHost,
dialect :"postgres",

});

console.log("dbUser after", dbUser);
 console.log("dbPassword after", dbPassword);

const account = databaseConnection.define('account', {
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
        readOnly: true,
    },
    first_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    isVerified:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, 
    },
    verification_token:{
        type: DataTypes.STRING,
        defaultValue: null, 
    },
    expiration_time:{
        type: DataTypes.DATE,
        defaultValue: null, 
    },
    
},
{
tableName: "accounts",
    indexes: [
      {
        unique: true,
        fields: ["username"],
      },
    ],
    timestamps: true,
    createdAt: "account_created",
    updatedAt: "account_updated",
  }
);




// Function to send email verification link using Mailgun API
const sendVerificationEmail = async (email, verificationLink,verificationtoken) => {
    // const mailgunApiKey = '325f9b0aec49fac0609d9abb27ee542c-f68a26c9-e987ec87'; // Replace with your Mailgun API key
    // const mailgunDomain = 'goudar.me'; // Replace with your Mailgun domain

    const auth = mailgun({
        apiKey: mailgunApiKey,
        domain: mailgun_domain
    });
    
   // const verificationLink = `http://goudar.me:8080/v1/user/emailverification/${verificationtoken}`;

    const mailData = {
        from: fromemail_Mailgun,
        to: email,
        subject: 'Verification of Your Email Address',
        text: `Click the following link to verify your email address: ${verificationLink}`,
    };

    auth.messages().send(mailData, async (error, body) => {
            if(error){
                console.error(`Error sending verification email: ${error}`);
            }
            else{
                console.log('Verification email sent successfully');
                await module.exports.userUpdate(email, verificationtoken);
            }
        });
       
};

module.exports.userUpdate = async (email, verificationtoken) => {
    const expirationTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiration
    console.log("expirationTime ", expirationTime);
    try {
      const user = await account.findOne({
        where: {
          username: email,
        },
      });
      console.log("user ", user);
  
      if (user) {
        user.verification_token = verificationtoken;
        user.expiration_time = expirationTime;

        await user.save();
        console.log("User verification details updated successfully.");
      } else {
        console.error("User not found.");
      }
    } catch (error) {
      console.error("Error updating user details:", error);
    }
  };

  module.exports.handleEmailVerification = async (message, context) => {
    try {
        const dataString = typeof message.data === 'string' ? message.data : JSON.stringify(message.data);
        console.log('Data String:', dataString);
        
        const data = JSON.parse(Buffer.from(dataString, 'base64').toString());
        console.log('Parsed Data:', data);

        const { verificationtoken, email } = data;
        const verificationLink = `${verification_link}/${verificationtoken}`;

        await sendVerificationEmail(email, verificationLink, verificationtoken);

    } catch (error) {
        console.error('Error processing email verification:', error);
        return { success: false, error: error.message };
    }
};

