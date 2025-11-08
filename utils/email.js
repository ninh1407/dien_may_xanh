const nodemailer = require('nodemailer');
const path = require('path');

// Create transporter
const createTransporter = () => {
  // Check if email configuration exists
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email configuration is incomplete. Email functionality may not work properly.');
    return null;
  }
  
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email helper
const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.warn('Email transporter not available. Skipping email send.');
      return null;
    }
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Điện Máy Xanh'}" <${process.env.EMAIL_FROM || 'no-reply@dienmayxanh.com'}>`,
      to,
      subject,
      html,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
};

// Email templates
const emailTemplates = {
  // Email verification template
  verification: (user, verificationUrl) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác thực email - Điện Máy Xanh</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Điện Máy Xanh</h1>
      </div>
      <div class="content">
        <h2>Xin chào ${user.firstName}!</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại Điện Máy Xanh. Để hoàn tất quá trình đăng ký, vui lòng xác thực email của bạn bằng cách nhấn vào nút bên dưới:</p>
        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">Xác thực Email</a>
        </div>
        <p>Nếu nút không hoạt động, bạn có thể sao chép và dán đường link sau vào trình duyệt:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>Link xác thực sẽ hết hạn sau 24 giờ.</p>
        <p>Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>
      </div>
      <div class="footer">
        <p>© 2024 Điện Máy Xanh. All rights reserved.</p>
      </div>
    </body>
    </html>
  `,

  // Password reset template
  passwordReset: (user, resetUrl) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Đặt lại mật khẩu - Điện Máy Xanh</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Điện Máy Xanh</h1>
      </div>
      <div class="content">
        <h2>Xin chào ${user.firstName}!</h2>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Để đặt lại mật khẩu, vui lòng nhấn vào nút bên dưới:</p>
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">Đặt lại mật khẩu</a>
        </div>
        <p>Nếu nút không hoạt động, bạn có thể sao chép và dán đường link sau vào trình duyệt:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <div class="warning">
          <strong>⚠️ Lưu ý:</strong> Link đặt lại mật khẩu sẽ hết hạn sau 1 giờ vì lý do bảo mật.
        </div>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu hiện tại của bạn sẽ không bị thay đổi.</p>
      </div>
      <div class="footer">
        <p>© 2024 Điện Máy Xanh. All rights reserved.</p>
      </div>
    </body>
    </html>
  `,

  // Order confirmation template
  orderConfirmation: (user, order) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác nhận đơn hàng - Điện Máy Xanh</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .order-details { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .item { border-bottom: 1px solid #eee; padding: 10px 0; }
        .item:last-child { border-bottom: none; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .total { font-weight: bold; font-size: 18px; color: #28a745; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Điện Máy Xanh</h1>
        <h2>Đơn hàng của bạn đã được xác nhận</h2>
      </div>
      <div class="content">
        <h3>Xin chào ${user.firstName}!</h3>
        <p>Cảm ơn bạn đã đặt hàng tại Điện Máy Xanh. Đơn hàng <strong>#${order.orderNumber}</strong> của bạn đã được xác nhận và đang được xử lý.</p>
        
        <div class="order-details">
          <h4>Chi tiết đơn hàng:</h4>
          <p><strong>Mã đơn hàng:</strong> ${order.orderNumber}</p>
          <p><strong>Ngày đặt:</strong> ${new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
          <p><strong>Trạng thái:</strong> ${getOrderStatusText(order.status)}</p>
          
          <h4>Sản phẩm:</h4>
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.price.toLocaleString('vi-VN')}đ</td>
                  <td>${(item.price * item.quantity).toLocaleString('vi-VN')}đ</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h4>Tổng cộng:</h4>
          <p><strong>Tạm tính:</strong> ${order.subtotal.toLocaleString('vi-VN')}đ</p>
          <p><strong>Phí vận chuyển:</strong> ${order.shipping.toLocaleString('vi-VN')}đ</p>
          <p><strong>Thuế VAT (10%):</strong> ${order.tax.toLocaleString('vi-VN')}đ</p>
          ${order.discount > 0 ? `<p><strong>Giảm giá:</strong> -${order.discount.toLocaleString('vi-VN')}đ</p>` : ''}
          <p class="total"><strong>Tổng cộng:</strong> ${order.total.toLocaleString('vi-VN')}đ</p>
        </div>
        
        <div class="order-details">
          <h4>Thông tin giao hàng:</h4>
          <p><strong>Người nhận:</strong> ${order.shippingAddress.fullName}</p>
          <p><strong>Số điện thoại:</strong> ${order.shippingAddress.phone}</p>
          <p><strong>Địa chỉ:</strong> ${order.shippingAddress.address}, ${order.shippingAddress.ward}, ${order.shippingAddress.district}, ${order.shippingAddress.province}</p>
        </div>
        
        <p>Bạn có thể theo dõi trạng thái đơn hàng tại: <a href="${process.env.FRONTEND_URL}/account/orders/${order._id}">Xem đơn hàng</a></p>
        <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email hoặc số điện thoại hỗ trợ.</p>
      </div>
      <div class="footer">
        <p>© 2024 Điện Máy Xanh. All rights reserved.</p>
        <p>Email: support@dienmayxanh.com | Hotline: 1900.1900</p>
      </div>
    </body>
    </html>
  `,

  // Order status update template
  orderStatusUpdate: (user, order) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cập nhật trạng thái đơn hàng - Điện Máy Xanh</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
        .pending { background: #ffc107; color: #000; }
        .confirmed { background: #17a2b8; color: #fff; }
        .processing { background: #fd7e14; color: #fff; }
        .shipped { background: #6f42c1; color: #fff; }
        .delivered { background: #28a745; color: #fff; }
        .cancelled { background: #dc3545; color: #fff; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Điện Máy Xanh</h1>
        <h2>Cập nhật trạng thái đơn hàng</h2>
      </div>
      <div class="content">
        <h3>Xin chào ${user.firstName}!</h3>
        <p>Trạng thái đơn hàng <strong>#${order.orderNumber}</strong> của bạn đã được cập nhật.</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <span class="status-badge ${order.status}">${getOrderStatusText(order.status)}</span>
        </div>
        
        <p><strong>Mã đơn hàng:</strong> ${order.orderNumber}</p>
        <p><strong>Ngày đặt:</strong> ${new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
        <p><strong>Tổng tiền:</strong> ${order.total.toLocaleString('vi-VN')}đ</p>
        
        ${order.timeline && order.timeline.length > 0 ? `
          <h4>Lịch sử cập nhật:</h4>
          <ul>
            ${order.timeline.map(entry => `
              <li><strong>${new Date(entry.timestamp).toLocaleDateString('vi-VN')}:</strong> ${entry.note}</li>
            `).join('')}
          </ul>
        ` : ''}
        
        <p>Bạn có thể xem chi tiết đơn hàng tại: <a href="${process.env.FRONTEND_URL}/account/orders/${order._id}">Xem đơn hàng</a></p>
        <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
      </div>
      <div class="footer">
        <p>© 2024 Điện Máy Xanh. All rights reserved.</p>
      </div>
    </body>
    </html>
  `,

  // Payment confirmation template
  paymentConfirmation: (user, order) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác nhận thanh toán - Điện Máy Xanh</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .success-icon { font-size: 48px; color: #28a745; text-align: center; margin: 20px 0; }
        .payment-details { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .total { font-weight: bold; font-size: 18px; color: #28a745; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Điện Máy Xanh</h1>
        <h2>Thanh toán thành công</h2>
      </div>
      <div class="content">
        <div class="success-icon">✅</div>
        <h3 style="text-align: center;">Thanh toán thành công!</h3>
        <p>Xin chào ${user.firstName},</p>
        <p>Chúng tôi xác nhận đã nhận được thanh toán cho đơn hàng <strong>#${order.orderNumber}</strong> của bạn.</p>
        
        <div class="payment-details">
          <h4>Thông tin thanh toán:</h4>
          <p><strong>Mã đơn hàng:</strong> ${order.orderNumber}</p>
          <p><strong>Phương thức thanh toán:</strong> ${getPaymentMethodText(order.paymentMethod)}</p>
          <p><strong>Số tiền:</strong> ${order.total.toLocaleString('vi-VN')}đ</p>
          <p><strong>Ngày thanh toán:</strong> ${new Date(order.paymentDate).toLocaleDateString('vi-VN')}</p>
        </div>
        
        <p>Đơn hàng của bạn sẽ được xử lý và giao hàng trong thời gian sớm nhất.</p>
        <p>Bạn có thể theo dõi trạng thái đơn hàng tại: <a href="${process.env.FRONTEND_URL}/account/orders/${order._id}">Xem đơn hàng</a></p>
        <p>Cảm ơn bạn đã mua sắm tại Điện Máy Xanh!</p>
      </div>
      <div class="footer">
        <p>© 2024 Điện Máy Xanh. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
};

// Helper functions
const getOrderStatusText = (status) => {
  const statusMap = {
    'pending': 'Chờ xác nhận',
    'confirmed': 'Đã xác nhận',
    'processing': 'Đang xử lý',
    'shipped': 'Đã giao hàng',
    'delivered': 'Đã giao thành công',
    'cancelled': 'Đã hủy',
    'refunded': 'Đã hoàn tiền'
  };
  return statusMap[status] || status;
};

const getPaymentMethodText = (method) => {
  const methodMap = {
    'stripe': 'Thẻ tín dụng/ghi nợ',
    'momo': 'Ví MoMo',
    'zalo_pay': 'ZaloPay',
    'bank_transfer': 'Chuyển khoản ngân hàng',
    'cod': 'Thanh toán khi nhận hàng'
  };
  return methodMap[method] || method;
};

// Email sending functions
const sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  const subject = 'Xác thực email - Điện Máy Xanh';
  const html = emailTemplates.verification(user, verificationUrl);
  
  await sendEmail(user.email, subject, html);
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const subject = 'Đặt lại mật khẩu - Điện Máy Xanh';
  const html = emailTemplates.passwordReset(user, resetUrl);
  
  await sendEmail(user.email, subject, html);
};

const sendOrderConfirmationEmail = async (email, order) => {
  const subject = `Xác nhận đơn hàng #${order.orderNumber} - Điện Máy Xanh`;
  const html = emailTemplates.orderConfirmation(order.user, order);
  
  await sendEmail(email, subject, html);
};

const sendOrderStatusUpdateEmail = async (email, order) => {
  const subject = `Cập nhật trạng thái đơn hàng #${order.orderNumber} - Điện Máy Xanh`;
  const html = emailTemplates.orderStatusUpdate(order.user, order);
  
  await sendEmail(email, subject, html);
};

const sendPaymentConfirmationEmail = async (email, order) => {
  const subject = `Xác nhận thanh toán đơn hàng #${order.orderNumber} - Điện Máy Xanh`;
  const html = emailTemplates.paymentConfirmation(order.user, order);
  
  await sendEmail(email, subject, html);
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendPaymentConfirmationEmail
};