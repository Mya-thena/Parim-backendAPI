// src/docs/swagger.config.js
const swaggerJSDoc = require("swagger-jsdoc");
require("dotenv").config();

const servers = process.env.NODE_ENV === "development" ? `http://localhost:${process.env.PORT}`: process.env.PROD_URL;

const options = {
	definition: {
		openapi: "3.0.3",
		info: {
			title: "Parim Pro API",
			version: "1.0.0",
			description: `Parim Pro Staff Management API Documentation.`,
			contact: {
				name: "Parim Pro Dev Team",
				email: "support@parimpro.com",
			},
			license: {
				name: "MIT License",
				// url: "https://opensource.org/licenses/MIT",
			},
		},
		servers: [{ url: servers }],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
			schemas: {
				User: {
					type: "object",
					properties: {
						id: { type: "string", example: "b12f5d91-4ef4-4b45-a5f3-bd2f731c8278" },
						name: { type: "string", example: "John Doe" },
						email: { type: "string", example: "johndoe@example.com" },
						role: { type: "string", example: "admin" },
						phoneNumber: { type: "string", example: "+2348012345678" },
						createdAt: { type: "string", format: "date-time" },
					},
				},
				ErrorResponse: {
					type: "object",
					properties: {
						error: { type: "boolean", example: true },
						message: { type: "string", example: "An error occurred" },
						status: { type: "integer", example: 500 },
					},
				},
				SuccessResponse: {
					type: "object",
					properties: {
						error: { type: "boolean", example: false },
						message: { type: "string", example: "Operation successful" },
						status: { type: "integer", example: 200 },
					},
				},
			},
		},
		security: [{ bearerAuth: [] }],
	},
	apis: ["./src/modules/auth/*.js"], // Path to route files
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec

