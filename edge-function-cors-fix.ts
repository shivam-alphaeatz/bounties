// Import the 'serve' function from the Deno standard library
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Define the CORS headers. 
// '*' allows any origin. For better security in production, you might want to replace
// it with your specific app's URL, e.g., 'https://your-app.vercel.app'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Start the server and listen for requests
serve(async (req) => {
  // This is a preflight request. It's a check browsers do before the actual request.
  // We need to respond with the CORS headers to let the browser know it's safe to proceed.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Your existing function logic starts here
    const { bucket_id } = await req.json();

    // --- YOUR BOUNTY GENERATION LOGIC GOES HERE ---
    // Example: generate some fake data based on the bucket_id
    let bounties = [];
    if (bucket_id === 0) {
      // Logic to fetch for all buckets
      bounties = [
        { bucket_id: 1, prompt: 'Nourish', bounties: ['Eat a vegetable', 'Drink water'] },
        { bucket_id: 6, prompt: 'Explore', bounties: ['Try a new route', 'Listen to a new song'] }
      ];
    } else {
      // Logic for a specific bucket
      bounties = [
        { bucket_id: bucket_id, prompt: `Category ${bucket_id}`, bounties: [`Bounty 1 for ${bucket_id}`, `Bounty 2 for ${bucket_id}`] }
      ];
    }
    // --- END OF YOUR LOGIC ---

    // Return the generated bounties with the CORS headers
    return new Response(JSON.stringify(bounties), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    // If an error occurs, return an error response, also with CORS headers
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

// To deploy this function:
// 1. Go to your Supabase project dashboard.
// 2. Navigate to "Edge Functions".
// 3. Select your "bountygen" function.
// 4. Replace the existing code with this code.
// 5. Save and deploy the function. 