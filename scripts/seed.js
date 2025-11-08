const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');

const connectDB = require('../config/database');

const categories = [
  {
    name: 'Điện thoại',
    slug: 'dien-thoai',
    description: 'Điện thoại thông minh các loại',
    image: '/uploads/categories/dien-thoai.jpg',
    icon: 'phone',
    color: '#FF6B6B',
    isActive: true,
    isFeatured: true,
    sortOrder: 1
  },
  {
    name: 'Laptop',
    slug: 'laptop',
    description: 'Máy tính xách tay các loại',
    image: '/uploads/categories/laptop.jpg',
    icon: 'laptop',
    color: '#4ECDC4',
    isActive: true,
    isFeatured: true,
    sortOrder: 2
  },
  {
    name: 'Máy tính bảng',
    slug: 'may-tinh-bang',
    description: 'Máy tính bảng các loại',
    image: '/uploads/categories/may-tinh-bang.jpg',
    icon: 'tablet',
    color: '#45B7D1',
    isActive: true,
    isFeatured: false,
    sortOrder: 3,
    parent: null
  },
  {
    name: 'Phụ kiện',
    slug: 'phu-kien',
    description: 'Phụ kiện điện tử',
    image: '/uploads/categories/phu-kien.jpg',
    icon: 'headphones',
    color: '#96CEB4',
    isActive: true,
    isFeatured: false,
    sortOrder: 4
  }
];

const products = [
  {
    name: 'iPhone 15 Pro Max',
    slug: 'iphone-15-pro-max',
    description: 'Điện thoại iPhone 15 Pro Max mới nhất từ Apple',
    longDescription: 'iPhone 15 Pro Max với chip A17 Pro mạnh mẽ, camera chuyên nghiệp, thiết kế titan cao cấp.',
    price: 34990000,
    originalPrice: 36990000,
    images: ['/uploads/products/iphone-15-pro-max-1.jpg', '/uploads/products/iphone-15-pro-max-2.jpg'],
    brand: 'Apple',
    model: 'iPhone 15 Pro Max',
    sku: 'IP15PM-256-Natural',
    stock: 50,
    specifications: {
      'Màn hình': '6.7 inch Super Retina XDR',
      'Chip': 'A17 Pro',
      'RAM': '8GB',
      'Bộ nhớ': '256GB',
      'Camera': '48MP + 12MP + 12MP',
      'Pin': '4422mAh'
    },
    features: ['Face ID', '5G', 'Wireless Charging', 'Water Resistant'],
    warranty: '12 tháng',
    weight: 221,
    dimensions: '159.9 x 76.7 x 8.25 mm',
    isActive: true,
    isFeatured: true,
    tags: ['iPhone', 'Apple', 'Flagship', '5G'],
    seoTitle: 'iPhone 15 Pro Max - Điện thoại cao cấp từ Apple',
    seoDescription: 'Mua iPhone 15 Pro Max với giá tốt nhất. Chip A17 Pro mạnh mẽ, camera chuyên nghiệp, thiết kế titan cao cấp.'
  },
  {
    name: 'MacBook Air M2',
    slug: 'macbook-air-m2',
    description: 'MacBook Air M2 siêu mỏng nhẹ và mạnh mẽ',
    longDescription: 'MacBook Air M2 với chip Apple M2, thiết kế siêu mỏng nhẹ, hiệu năng vượt trội.',
    price: 28990000,
    originalPrice: 30990000,
    images: ['/uploads/products/macbook-air-m2-1.jpg', '/uploads/products/macbook-air-m2-2.jpg'],
    brand: 'Apple',
    model: 'MacBook Air M2',
    sku: 'MBA-M2-256-Silver',
    stock: 30,
    specifications: {
      'Màn hình': '13.6 inch Liquid Retina',
      'Chip': 'Apple M2',
      'RAM': '8GB',
      'Bộ nhớ': '256GB SSD',
      'Camera': '1080p FaceTime HD',
      'Pin': '18 giờ'
    },
    features: ['Touch ID', 'Magic Keyboard', 'Force Touch Trackpad'],
    warranty: '12 tháng',
    weight: 1240,
    dimensions: '304.1 x 215 x 11.3 mm',
    isActive: true,
    isFeatured: true,
    tags: ['MacBook', 'Apple', 'Laptop', 'M2'],
    seoTitle: 'MacBook Air M2 - Laptop siêu mỏng nhẹ và mạnh mẽ',
    seoDescription: 'MacBook Air M2 với chip Apple M2, thiết kế siêu mỏng nhẹ, hiệu năng vượt trội cho công việc và giải trí.'
  },
  {
    name: 'iPad Pro M2 12.9 inch',
    slug: 'ipad-pro-m2-129',
    description: 'iPad Pro M2 12.9 inch mạnh mẽ cho công việc sáng tạo',
    longDescription: 'iPad Pro M2 12.9 inch với chip M2 mạnh mẽ, màn hình Liquid Retina XDR tuyệt đẹp.',
    price: 28990000,
    originalPrice: 31990000,
    images: ['/uploads/products/ipad-pro-m2-129-1.jpg', '/uploads/products/ipad-pro-m2-129-2.jpg'],
    brand: 'Apple',
    model: 'iPad Pro M2',
    sku: 'IPP-M2-129-256-Silver',
    stock: 25,
    specifications: {
      'Màn hình': '12.9 inch Liquid Retina XDR',
      'Chip': 'Apple M2',
      'RAM': '8GB',
      'Bộ nhớ': '256GB',
      'Camera': '12MP + 10MP',
      'Pin': '10 giờ'
    },
    features: ['Face ID', 'Apple Pencil Support', 'Magic Keyboard Support'],
    warranty: '12 tháng',
    weight: 682,
    dimensions: '280.6 x 214.9 x 6.4 mm',
    isActive: true,
    isFeatured: false,
    tags: ['iPad', 'Apple', 'Tablet', 'M2'],
    seoTitle: 'iPad Pro M2 12.9 inch - Máy tính bảng cao cấp',
    seoDescription: 'iPad Pro M2 12.9 inch với chip M2 mạnh mẽ, màn hình Liquid Retina XDR tuyệt đẹp cho công việc sáng tạo.'
  },
  {
    name: 'AirPods Pro 2',
    slug: 'airpods-pro-2',
    description: 'Tai nghe AirPods Pro 2 với khử tiếng ồn chủ động',
    longDescription: 'AirPods Pro 2 với khử tiếng ồn chủ động, âm thanh không gian, chip H2 mới.',
    price: 5990000,
    originalPrice: 6990000,
    images: ['/uploads/products/airpods-pro-2-1.jpg', '/uploads/products/airpods-pro-2-2.jpg'],
    brand: 'Apple',
    model: 'AirPods Pro 2',
    sku: 'APP2-White',
    stock: 100,
    specifications: {
      'Chip': 'Apple H2',
      'Khử tiếng ồn': 'Có',
      'Chống nước': 'IPX4',
      'Thời gian pin': '6 giờ',
      'Case pin': '30 giờ'
    },
    features: ['Active Noise Cancellation', 'Spatial Audio', 'Adaptive Transparency'],
    warranty: '12 tháng',
    weight: 54,
    dimensions: '45.2 x 60.6 x 21.7 mm',
    isActive: true,
    isFeatured: true,
    tags: ['AirPods', 'Apple', 'Headphones', 'Wireless'],
    seoTitle: 'AirPods Pro 2 - Tai nghe không dây cao cấp',
    seoDescription: 'AirPods Pro 2 với khử tiếng ồn chủ động, âm thanh không gian, chip H2 mới cho trải nghiệm âm thanh tuyệt vời.'
  }
];

const users = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@dienmayxanh.com',
    password: 'Admin@123',
    phone: '0123456789',
    role: 'admin',
    isActive: true,
    isVerified: true
  },
  {
    firstName: 'Customer',
    lastName: 'User',
    email: 'customer@example.com',
    password: 'Customer@123',
    phone: '0987654321',
    role: 'customer',
    isActive: true,
    isVerified: true
  }
];

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    console.log('Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      const newUser = await User.create({
        ...user,
        password: hashedPassword
      });
      createdUsers.push(newUser);
    }
    console.log('Created users');

    // Create categories
    const createdCategories = [];
    for (const category of categories) {
      const newCategory = await Category.create(category);
      createdCategories.push(newCategory);
    }
    console.log('Created categories');

    // Create products
    const createdProducts = [];
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const categoryIndex = i < 2 ? 0 : i === 2 ? 1 : 2; // Assign to appropriate categories
      const newProduct = await Product.create({
        ...product,
        category: createdCategories[categoryIndex]._id
      });
      createdProducts.push(newProduct);

      // Update category product count
      await Category.findByIdAndUpdate(
        createdCategories[categoryIndex]._id,
        { $inc: { productCount: 1 } }
      );
    }
    console.log('Created products');

    console.log('Database seeding completed successfully!');
    console.log(`Created ${createdUsers.length} users`);
    console.log(`Created ${createdCategories.length} categories`);
    console.log(`Created ${createdProducts.length} products`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the seed function
seedDatabase();