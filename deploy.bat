@echo off
echo --- Digital Portfolio Deployment Tool ---

:: 1. Backend Deployment (Supabase)
echo.
echo [1/2] Deploying Supabase Backend...

echo Linking to project pkpnyvpzsgfdrecakywz...
cd frontend
call npx supabase link --project-ref pkpnyvpzsgfdrecakywz

echo Deploying database schema...
call npx supabase db push

echo Deploying edge functions...
call npx supabase functions deploy build-portfolio --project-ref pkpnyvpzsgfdrecakywz
call npx supabase functions deploy generate-blueprint --project-ref pkpnyvpzsgfdrecakywz
call npx supabase functions deploy parse-resume --project-ref pkpnyvpzsgfdrecakywz

cd ..

:: 2. Frontend Deployment (Vercel)
echo.
echo [2/2] Frontend Deployment...
echo Please ensure you have the Vercel CLI installed or use the Vercel Dashboard.
echo To deploy via CLI:
echo   cd frontend
echo   vercel --prod

echo.
echo Deployment triggered! Please check your dashboards for status.
echo Supabase: https://supabase.com/dashboard/project/pkpnyvpzsgfdrecakywz
echo.
pause
