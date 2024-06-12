const { DataTypes } = require('sequelize')

const sequelize = require('../lib/sequelize')
const Assignment = require('./assignment')

const Course = sequelize.define('course', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    subject: { type: DataTypes.STRING, allowNull: false},
    number: { type: DataTypes.STRING, allowNull: false},
    title: { type: DataTypes.STRING, allowNull: false},
    term: { type: DataTypes.STRING, allowNull: false},
    instructorId: { type: DataTypes.INTEGER, allowNull: false}
})

Course.hasMany(Assignment, {foreignKey: { allowNull: false }})
Assignment.belongsTo(Course)


exports.Course = Course

exports.CourseClientFields = [
    'subject',
    'number',
    'title',
    'term',
    'instructorId'
]