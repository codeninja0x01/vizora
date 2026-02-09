// Prisma 7 connection configuration
// See https://pris.ly/d/config-datasource

export default {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};
