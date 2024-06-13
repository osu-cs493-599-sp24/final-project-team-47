const { Router } = require('express')

const { Course, CourseClientFields } = require('../models/course')
const { ValidationError } = require('sequelize')

const { requireAuthentication } = require('../lib/auth')

const router = Router()

/*
 * GET /courses
 * Route to fetch list of courses
 */
router.get('/', async (req, res, next) => {
    const { subject, number, term } = req.query

    let filterConditions = {}
    if (subject) { 
        filterConditions.subject = subject 
    }
    if (number) { 
        filterConditions.number = number 
    }
    if (term) { 
        filterConditions.term = term 
    }

    const numPerPage = 10
    const totalRows = await Course.count({
        where: filterConditions
    })
    const lastPage = Math.ceil(totalRows / numPerPage)

    let page = parseInt(req.query.page) || 1
    page = page < 1 ? 1 : page
    page = page > lastPage ? lastPage : page

    const offset = (page - 1) * numPerPage

    try {
        const result = await Course.findAndCountAll({
            where: filterConditions,
            limit: numPerPage,
            offset: offset
        })

        /*
         * Generate HATEOAS links for surrounding pages.
         */
        const links = {}
        if (page < lastPage) {
            links.nextPage = `/courses?page=${page + 1}`
            links.lastPage = `/courses?page=${lastPage}`
        }
        if (page > 1) {
            links.prevPage = `/courses?page=${page - 1}`
            links.firstPage = `/courses?page=1`
        }
        if (subject) {
            for (let key in links) { // loop thru each property of the 'links' object
                links[key] += `&subject=${subject}`
            }
        }
        if (number) {
            for (let key in links) { // loop thru each property of the 'links' object
                links[key] += `&number=${number}`
            }
        }
        if (term) {
            for (let key in links) { // loop thru each property of the 'links' object
                links[key] += `&term=${term}`
            }
        }

        /*
         * Construct and send response.
         */
        res.status(200).send({
            courses: result.rows,
            pageNumber: page,
            totalPages: lastPage,
            pageSize: numPerPage,
            totalCount: result.count,
            links: links
        })
    } catch (e) {
        next(e)
    }
});

/*
 * POST /courses
 * Route to create new course
 */
router.post('/', requireAuthentication, async (req, res, next) => {
    if (req.role !== 'admin') {
        res.status(403).send({
            error: "Not authorized to access the specified resource"
        })
    } else {
        try {
            const course = await Course.create(req.body, CourseClientFields);
            res.status(201).json(course);
        } catch (error) {
            if (error instanceof ValidationError) {
                res.status(400).send({ error: error.message })
            } else {
                next(error)
            }
        }
    }
});

/*
 * GET /courses/{id}
 * Route to fetch info of specific course
 */
router.get('/:courseId', async (req, res, next) => {
    const { courseId } = req.params
    try {
        const course = await Course.findByPk(courseId)
        if (course) {
            res.status(200).send(course)
        } else {
            next()
        }
    } catch (e) {
        next(e)
    }
})

/*
 * PATCH /courses/{id}
 * Route to update info of specific course
 */
router.patch('/:id', requireAuthentication, async (req, res, next) => {
    // first verify that user is authorized to access resource
    let authorized = false
    if (req.role === 'admin' ) {
        authorized = true
    } else if (req.role == 'instructor') {
        if (await Course.findOne({ where: { id: req.params.id, instructorId: req.user }}))
            authorized = true
    }

    if (authorized) {
        try {
            const updated = await Course.update(req.body, {
                where: { id: req.params.id },
                fields: CourseClientFields
            });
            if (updated[0] > 0) {
                res.status(204).send()
            } else {
                next()
            }
        } catch (error) {
            if (error instanceof ValidationError) {
                res.status(400).send({ error: error.message })
            } else {
                next(error)
            }
        }
    } else {
        res.status(403).send({
            error: "Not authorized to access the specified resource"
        })
    }
});

/*
 * DELETE /courses/{id}
 * Route to delete course
 */
router.delete('/:courseId', requireAuthentication, async (req, res, next) => {
    if (req.role !== 'admin') {
        res.status(403).send({
            error: "Not authorized to access the specified resource"
        })
    } else {
        const { courseId } = req.params
        let result = null
        try {
            result = await Course.findByPk(courseId)
            if (result == null) {
                next()
            } else {
                result = await Course.destroy({ where: { id: courseId } })
                if (result > 0) {
                    res.status(204).send()
                } else {
                    next()
                }
            }
        } catch (e) {
            next(e)
        }
    }
});

module.exports = router