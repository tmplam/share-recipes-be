const { getRecipes, getNumOfRecipes, getFavouriteRecipes, getRecipe, getUserProfile, getRoleByRoleId } = require('../queries/index')
const { getRecipesOfUser, getUserRecipeCount, addNewRecipe, updateRecipe, changeRecipeStatus } = require('../queries/recipe-queries')
const { isInFavourites } = require('../queries/favourite-queries')
const { isEmpty } = require('../utils/objectUtils')
const { uploadFileToGCP } = require('../helpers/gcp')
const boolean = require('../utils/booleanUtils');

// get all approved recipes
const getRecipesController = async (req, res) => {
    try {
        const category = req.query['category'] || 'all'
        let page = req.query['page'] || 1
        page = parseInt(page)
        const keyword = req.query['keyword'] || null
        const status = 'Approved'
        const recipeCount = await getNumOfRecipes(category, status, keyword)
        let perPage = req.query['per_page'] || recipeCount
        perPage = parseInt(perPage)
        const sortBy = req.query['sort_by'] || 'date'
        let recipeData = await getRecipes(page, perPage, sortBy, category, status, keyword)

        // add field isFavourite
        const userData = req.user
        if (isEmpty(userData) === false) {

            const favouriteRecipes = await getFavouriteRecipes(userData.userid)
            for (const r of recipeData) {
                r.isfavourite = favouriteRecipes.some(fav => fav.recipeid === r.recipeid);
            }
        } else {
            for (const r of recipeData) {
                r.isfavourite = false
            }
        }

        //Response
        res.json({
            status: 200,
            page: page,
            per_page: perPage,
            total: recipeCount,
            total_page: recipeCount % perPage === 0 ? Math.floor(recipeCount / perPage) : Math.floor(recipeCount / perPage) + 1,
            sort_by: sortBy,
            category: category,
            keyword: keyword,
            data: recipeData
        })
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: err.message
        })
    }
}

const getPendingRecipesController = async (req, res) => {
    try {
        const status = 'Pending'
        const category = req.query['category'] || 'all'
        let page = req.query['page'] || 1
        page = parseInt(page)
        const recipeCount = await getNumOfRecipes(category, status)
        let perPage = req.query['per_page'] || recipeCount
        perPage = parseInt(perPage)
        const sortBy = req.query['sort_by'] || 'date'
        const recipeData = await getRecipes(page, perPage, sortBy, category, status)

        //Response
        res.json({
            status: 200,
            page: page,
            per_page: perPage,
            total: recipeCount,
            total_page: recipeCount % perPage === 0 ? Math.floor(recipeCount / perPage) : Math.floor(recipeCount / perPage) + 1,
            sort_by: sortBy,
            category: category,
            data: recipeData
        })
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: err.message
        })
    }
}

const getDeletedRecipesController = async (req, res) => {
    try {
        const status = 'Deleted'
        const category = req.query['category'] || 'all'
        let page = req.query['page'] || 1
        page = parseInt(page)
        const recipeCount = await getNumOfRecipes(category, status)
        let perPage = req.query['per_page'] || recipeCount
        perPage = parseInt(perPage)
        const sortBy = req.query['sort_by'] || 'date'
        const recipeData = await getRecipes(page, perPage, sortBy, category, status)

        //Response
        res.json({
            status: 200,
            page: page,
            per_page: perPage,
            total: recipeCount,
            total_page: recipeCount % perPage === 0 ? Math.floor(recipeCount / perPage) : Math.floor(recipeCount / perPage) + 1,
            sort_by: sortBy,
            category: category,
            data: recipeData
        })
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: err.message
        })
    }
}

// get specific recipe by id
const getRecipeController = async (req, res) => {
    let id = req.params['id']

    try {
        id = boolean.uuidValidate(id);
        const recipeData = await getRecipe(id)
        //check user
        const userData = req.user
        if (recipeData.status !== 'Approved') {
            if (!isEmpty(userData)) {
                const roleName = await getRoleByRoleId(userData.role)
                if (roleName === 'User' && userData.userid !== recipeData.author) {
                    throw new Error('Bạn không có quyền truy cập vào tài nguyên này')
                }
            }
            else {
                throw new Error('Bạn không có quyền truy cập vào tài nguyên này')
            }
        } else {
            if (!isEmpty(userData)) {
                const isFavourite = await isInFavourites(userData.userid, id)
                recipeData.isfavourite = isFavourite
            }
            else {
                recipeData.isfavourite = false
            }
        }

        res.json({
            status: 200,
            data: recipeData
        })
    }
    catch (err) {
        res.status(500).json({
            status: 500,
            message: err.message
        })
    }
}

const recipesCountController = async (req, res) => {
    const category = req.query['category'] || 'all'
    try {
        const recipeCount = await getNumOfRecipes(category)
        res.json({
            status: 200,
            category: category,
            data: {
                count: recipeCount
            }
        })
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: err.message
        })
    }
}

const getRecipesOfUserController = async (req, res) => {
    let userId = req.user.userId

    try {
        userId = boolean.uuidValidate(userId);
        const category = req.query['category'] || 'all'
        const status = req.query['status'] || null
        let page = req.query['page'] || 1
        page = parseInt(page)
        const keyword = req.query['keyword'] || null
        const recipeCount = await getUserRecipeCount(userId, category, status, keyword)
        let perPage = req.query['per_page'] || recipeCount
        perPage = parseInt(perPage)
        const sortBy = req.query['sort_by'] || 'date'
        let recipeData = await getRecipesOfUser(userId, page, perPage, sortBy, category, status, keyword)

        res.json({
            status: 200,
            page: page,
            per_page: perPage,
            total: recipeCount,
            total_page: recipeCount % perPage === 0 ? Math.floor(recipeCount / perPage) : Math.floor(recipeCount / perPage) + 1,
            sort_by: sortBy,
            category: category,
            recipe_status: status,
            user: userId,
            data: recipeData
        })
    }
    catch (err) {
        res.status(500).json({
            status: 500,
            message: err.message
        })
    }
}


const addNewRecipeController = async (req, res) => {
    let userId = req.user.userId
    try {
        userId = boolean.uuidValidate(userId);
        const name = req.body['name']
        const description = req.body['description']
        const estimatedTime = req.body['estimatedTime']
        const ingredients = req.body['ingredients']
        const instruction = req.body['instruction']
        const category = req.body['category']
        const recipeId = await addNewRecipe({ userId, name, description, estimatedTime, ingredients, instruction, category })
        let avatar = null
        if (req.file) {
            req.fileName = recipeId
            req.folderName = 'RecipeAvatar'
            avatar = await uploadFileToGCP(req)
            await updateRecipe({
                recipeId: recipeId,
                avatar: avatar
            })
        }
        res.json({
            status: 200,
            message: 'Thêm công thức thành công'
        })
    }
    catch (err) {
        res.status(500).json({
            status: 500,
            message: err.message
        })
    }
}


const updateRecipeController = async (req, res) => {
    let userId = req.user.userId
    let recipeId = req.params['id']
    try {
        userId = boolean.uuidValidate(userId);
        recipeId = boolean.uuidValidate(recipeId);
        const recipe = await getRecipe(recipeId)
        if (isEmpty(recipe) || recipe.author !== userId) {
            throw {
                status: 400,
                message: 'Công thức không tồn tại'
            }
        }
        const name = req.body['name']
        const description = req.body['description']
        const estimatedTime = req.body['estimatedTime']
        const ingredients = req.body['ingredients']
        const instruction = req.body['instruction']
        const category = req.body['category']
        let avatar = null
        if (req.file) {
            req.fileName = recipeId
            req.folderName = 'RecipeAvatar'
            avatar = await uploadFileToGCP(req)
        }

        await updateRecipe({
            recipeId: recipeId,
            name: name,
            description: description,
            estimatedTime: estimatedTime,
            ingredients: ingredients,
            instruction: instruction,
            category: category,
            avatar: avatar
        })
        res.json({
            status: 200,
            message: 'Thêm công thức thành công'
        })
    }
    catch (err) {
        res.status(err.status).json({
            status: err.status,
            message: err.message
        })
    }
}

const changeRecipeStatusController = async (req, res) => {
    let userId = req.user.userId
    const userRole = req.user.role
    let recipeId = req.params['id']
    const newStatus = req.body['status']

    try {
        userId = boolean.uuidValidate(userId);
        recipeId = boolean.uuidValidate(recipeId);
        const recipe = await getRecipe(recipeId)
        if (isEmpty(recipe)) {
            throw {
                status: 400,
                message: 'Công thức không tồn tại'
            }
            // } else if () {

        } else if (userRole === 1 && recipe.author !== userId) {
            throw {
                status: 403 ,
                message: 'Bạn không có quyền thay đổi'
            }
        }
        await changeRecipeStatus({ recipeId, newStatus })

        return res.json({
            status: 200,
            message: 'Thay đổi trạng thái thành công'
        })
    }
    catch (err) {
        return res.status(err.status).json({
            status: err.status,
            message: err.message
        })
    }
}

module.exports = {
    recipesCountController,
    getRecipesController,
    getRecipeController,
    getPendingRecipesController,
    getDeletedRecipesController,
    getRecipesOfUserController,
    addNewRecipeController,
    updateRecipeController,
    changeRecipeStatusController
}