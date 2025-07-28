const mysql = require('mysql2/promise');

// Test database connection
async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'menu_gen',
    port: process.env.DB_PORT || 3306
  };

  try {
    console.log(`📡 Connecting to: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`🗄️  Database: ${dbConfig.database}`);
    console.log(`👤 User: ${dbConfig.user}`);
    
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection successful!');
    
    // Test query
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM meals');
    console.log(`📊 Found ${rows[0].count} meals in database`);
    
    // Test a sample meal
    const [sampleMeals] = await connection.execute('SELECT name, protein, cuisine FROM meals LIMIT 3');
    console.log('🍽️  Sample meals:');
    sampleMeals.forEach(meal => {
      console.log(`   - ${meal.name} (${meal.protein}, ${meal.cuisine})`);
    });
    
    await connection.end();
    console.log('🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('   Error:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting tips:');
    console.error('   1. Check your NAS IP address');
    console.error('   2. Verify MariaDB is running on your NAS');
    console.error('   3. Check username/password');
    console.error('   4. Ensure database "menu_gen" exists');
    console.error('   5. Check firewall settings');
    console.error('');
    console.error('📋 Common solutions:');
    console.error('   - Make sure MariaDB is installed and running on Synology');
    console.error('   - Check MariaDB port (usually 3306)');
    console.error('   - Verify user has proper permissions');
    console.error('   - Try connecting from phpMyAdmin first');
  }
}

// Run the test
testConnection(); 