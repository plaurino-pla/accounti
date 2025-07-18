#!/bin/bash

echo "🚀 Setting up Accounti - Smart Invoice Organizer"
echo "================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration values"
fi

# Create logs directory
mkdir -p backend/logs

# Create build directories
mkdir -p frontend/build

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Set up Google Cloud Project and enable APIs"
echo "3. Configure Firebase project"
echo "4. Set up Stripe account and products"
echo "5. Run 'npm run dev' to start development servers"
echo ""
echo "📚 For detailed setup instructions, see DEPLOYMENT.md" 