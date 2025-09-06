#!/bin/sh

echo "🚀 Setting up OnEmployment database..."
echo ""

echo "📦 Starting containers..."
docker compose up -d --wait

echo "🔄 Running database migrations..."
npm run docker:db:migrate

echo "🎯 Generating Prisma client (container)..."
npm run docker:db:generate

echo "🎯 Generating Prisma client (local IDE support)..."
npx prisma generate

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📊 Database status:"
npm run docker:db:status

echo ""
echo "🎉 Ready for development!"
echo "   • Database tables created"
echo "   • Prisma client generated for container runtime"
echo "   • Prisma client generated for local IDE support"
echo ""
echo "Next steps:"
echo "   • Run 'npm run seed:db' to populate with sample data"
echo "   • Run 'npm run docker:db:studio' to view database"
echo "   • Start coding! 🚀"