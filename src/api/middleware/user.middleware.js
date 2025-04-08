const bcrypt = require("bcrypt");
const validator = require("validator");

const checkValidateLogin = (req, res, next) => {
	try {
		const { email, password } = req.body;

		if (email === undefined || password === undefined) {
			return res
				.status(400)
				.json({ message: "Email and password are required" });
		}

		// Check email format
		if (validator.isEmail(email) === false) {
			return res.status(400).json({ message: "Invalid email format haha" });
		}

		next();
	} catch (error) {
		console.error(error);
		next(error);
	}
};

const checkValidateRegister = (req, res, next) => {
	try {
		const { email, password, confirmPassword, username } = req.body;

		if (
			email === undefined ||
			username === undefined ||
			password === undefined ||
			confirmPassword === undefined
		) {
			return res.status(400).json({ message: "Please fill out fields" });
		}

		// Check email format
		if (validator.isEmail(email) === false) {
			return res.status(400).json({ message: "Invalid email format" });
		}
		if (password !== confirmPassword) {
			return res.status(400).json({ message: "Password does not match" });
		}

		next();
	} catch (error) {
		console.error(error);
		next(error);
	}
};

const comparePassword = async function (password) {
	try {
		return await bcrypt.compare(password, this.password);
	} catch (error) {
		console.error(error);
		return false;
	}
};

const hashPassword = async function (next) {
	try {
		console.log("password:", this.password);
		const salt = await bcrypt.genSalt(10);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (error) {
		console.error(error);
		next(error);
	}
};

module.exports = {
	comparePassword,
	hashPassword,
	checkValidateLogin,
	checkValidateRegister,
};
