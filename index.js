import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import pg from 'pg';
const { Client } = pg;
import { PubSub } from '@google-cloud/pubsub';
import mailgun from 'mailgun-js';
import { DataTypes, Sequelize } from "sequelize";

dotenv.config();


const dbHost = process.env.DATABASE_HOST;
const dbPort = process.env.DATABASE_PORT;
const dbUser = process.env.DATABASE_USER;
const dbPassword = process.env.DATABASE_PASSWORD;
const dbDatabase = process.env.DATABASE_NAME; 

const databaseConnection = new Sequelize(dbUser,dbPassword,  dbDatabase, {
host :dbHost,
dialect :"postgres",

});

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
    account_created: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
    },
    account_updated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
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
});




// Function to send email verification link using Mailgun API
const sendVerificationEmail = async (email, verificationtoken) => {
    const mailgunApiKey = '325f9b0aec49fac0609d9abb27ee542c-f68a26c9-e987ec87'; // Replace with your Mailgun API key
    const mailgunDomain = 'goudar.me'; // Replace with your Mailgun domain

    const auth = mailgun({
        apiKey: mailgunApiKey,
        domain: mailgunDomain
    });

    const mailData = {
        from: 'Aniruddh Goudar <postmaster@goudar.me>',
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
                await userInfoUpdate(email, verificationtoken);
            }
        });
       
};

export const userInfoUpdate = async (email, verificationtoken) => {
    const expirationTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiration
  
    try {
      const user = await account.findOne({
        where: {
          username: email,
        },
      });
      console.log("user ", user);
  
      if (user) {
        user.verification_token = token;
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

export const handleEmailVerification = async (message, context) => {
    try {
        const dataString = typeof message.data === 'string' ? message.data : JSON.stringify(message.data);
        console.log('Data String:', dataString);
        
        const data = JSON.parse(Buffer.from(dataString, 'base64').toString());
        console.log('Parsed Data:', data);

        const { verificationtoken, email } = data;

        const expirationTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiration
        const verificationLink = `https://goudar:8080/v1/user/emailverification/${verificationtoken}`;

        await sendVerificationEmail(email, verificationLink);

    } catch (error) {
        console.error('Error processing email verification:', error);
        return { success: false, error: error.message };
    }
};

