/**
 * Common APP Model to define Common ORM
 * 
 */
var Model = require('../config/database');
// Import the plugin for soft delete recored
// // const softDelete = require('objection-soft-delete');
// // Plugin for encript and descript data
// var Cryptr = require('cryptr'),
// 	cryptr = new Cryptr(require('../config/secret')());

// class AppModel extends softDelete({	columnName: 'is_deleted'})(Model) {
class AppModel extends Model {
	constructor() {
		super();
	}
	// It's call just befor any insert opration is executed.
	async $beforeInsert(queryContext) {

		await super.$beforeInsert(queryContext);

		this.created_at = new Date().toISOString();
		this.updated_at = new Date().toISOString();

	}

	// It's call just before any update opration is executed
	async $beforeUpdate(queryContext) {

		await super.$beforeUpdate(queryContext);
		this.updated_at = new Date().toISOString();

	}

	/**
	 * Encript Id
	 * Used for encript user id
	 * 
	 * @param number id user_id
	 * 
	 * @returns string encripted id
	 */
	// encript_id() {

	// 	if (this.id) {
	// 		return cryptr.encrypt(this.id);
	// 	}
	// }

	// // Encrypt id
	// static encript_id_new(id) {
	// 	return cryptr.encrypt(id);
	// }

	/**
	 * Decript Id
	 * Used for decript user id
	 * 
	 * @param number id user_id
	 * 
	 * @returns string decripted id
	 */
	static decript_id(id) {
		return cryptr.decrypt(id);
	}
}

module.exports.AppModel = AppModel;