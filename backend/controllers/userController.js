import sequelize from '../database';

export const getUsers = async (req, res) => {
  try {
    const users = await sequelize.query('SELECT * FROM users', {
      type: sequelize.QueryTypes.SELECT,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};