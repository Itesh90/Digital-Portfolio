@echo off
echo --- Digital Portfolio Deployment Tool ---

:: 1. Backend Deployment (Supabase)
echo.
echo [1/2] Deploying Supabase Backend...
echo Checking for Supabase CLI...
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Supabase CLI not found. Please install it first:
    echo npm install supabase --save-dev
    exit /b 1
)

echo Linking to project pkpnyvpzsgfdrecakywz...
npx supabase link --project-ref pkpnyvpzsgfdrecakywz

echo Deploying database schema...
npx supabase db push

echo Deploying edge functions...
npx supabase functions deploy build-portfolio
npx supabase functions deploy generate-blueprint
npx supabase functions deploy parse-resume

:: 2. Frontend Deployment (Vercel)
echo.
echo [2/2] Frontend Deployment...
echo Please ensure you have the Vercel CLI installed or use the Vercel Dashboard.
echo To deploy via CLI:
echo cd frontend
echo vercel --prod

echo.
echo Deployment triggered! Please check your dashboards for status.
echo Supabase: https://supabase.com/dashboard/project/pkpnyvpzsgfdrecakywz
echo.
pause
