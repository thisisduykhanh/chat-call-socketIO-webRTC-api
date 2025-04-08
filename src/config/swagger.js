// swagger.js
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("node:path");

require("dotenv").config();

// Cấu hình Swagger
const swaggerDefinition = {
	openapi: "3.0.0", // Phiên bản của Swagger
	info: {
		title: "Express API",
		version: "1.0.0",
		description: "API documentation for Express app",
	},
	servers: [
		{
			url: process.env.BACKEND_URL, // URL của API
		},
	],
	components: {
		securitySchemes: {
			BearerAuth: {
				// Định nghĩa Security scheme cho Bearer token
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
	},
	security: [
		{
			BearerAuth: [], // Đảm bảo toàn bộ API yêu cầu xác thực JWT
		},
	],

	tags: [
		{ name: "User", description: "User related operations" }, // Tag cho User API
		{ name: "Product", description: "Product related operations" }, // Tag cho Product API
	],
};

// Cấu hình để swagger-jsdoc biết nơi có các JSDoc comments
const options = {
	swaggerDefinition,
	explorer: true,
	// apis: ['../routes/*.js'],
	apis: [
		path.join(__dirname, "../routes/*.js"),
		path.join(__dirname, "../routes/v1/*.js"),
	], // Đường dẫn đến các file chứa JSDoc comments
};

// Tạo Swagger spec
const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };
