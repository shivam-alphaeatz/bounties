# ImageKit Setup Guide

This guide will help you set up ImageKit integration for direct image uploads in your bounty management system.

## Prerequisites

1. An ImageKit account (sign up at https://imagekit.io/)
2. Your ImageKit API credentials

## Setup Steps

### 1. Get Your ImageKit Credentials

1. Log in to your ImageKit dashboard
2. Go to **Settings** → **API Keys**
3. Copy your **Private API Key**

### 2. Configure Environment Variables

Create or update your `.env` file in the project root with:

```env
REACT_APP_IMAGEKIT_API_KEY=your_private_api_key_here
```

**Important Notes:**
- Replace `your_private_api_key_here` with your actual ImageKit Private API Key
- The environment variable must start with `REACT_APP_` for React to recognize it
- Never commit your API key to version control

### 3. Restart Your Development Server

After adding the environment variable, restart your React development server:

```bash
npm start
```

## How It Works

### File Naming Convention

When you upload an image, it will be automatically named using this format:
```
{sanitized-bounty-name}-{bounty-id}.{file-extension}
```

**Example:**
- Bounty Name: "Complete Daily Exercise"
- Bounty ID: "12345"
- Original File: "workout.jpg"
- Final Name: "complete-daily-exercise-12345.jpg"

### Upload Process

1. **File Selection**: Choose an image file (max 10MB)
2. **Validation**: File type and size are validated
3. **Upload**: File is uploaded directly to ImageKit's `/bounties` folder
4. **URL Generation**: ImageKit returns a CDN URL
5. **Database Storage**: URL is automatically saved to your Supabase database
6. **Transformation**: Image transformation parameters are appended to the URL

### Image Transformations

All uploaded images automatically get these transformation parameters:
- Width: 1024px
- Height: 683px
- Quality: 90%
- Format: WebP

## Features

- ✅ Direct file upload to ImageKit
- ✅ Automatic URL generation and database storage
- ✅ File type and size validation
- ✅ Upload progress indicator
- ✅ Fallback to manual URL entry
- ✅ Automatic image optimization
- ✅ Organized folder structure

## Troubleshooting

### "ImageKit is not configured" Error
- Make sure you've added `REACT_APP_IMAGEKIT_API_KEY` to your `.env` file
- Restart your development server after adding the environment variable

### Upload Fails
- Check your ImageKit API key is correct
- Verify your ImageKit account has sufficient credits
- Ensure the file is under 10MB and is a valid image format

### File Not Found After Upload
- Check your ImageKit dashboard under the `/bounties` folder
- Verify the file naming convention is working correctly

## Security Notes

- Your API key is used only for uploads, not for serving images
- Images are served through ImageKit's CDN with public URLs
- The API key is only used in the frontend for direct uploads
- Consider using a public key for read-only operations if needed

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your ImageKit account status
3. Ensure your API key has upload permissions 