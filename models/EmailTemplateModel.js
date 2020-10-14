/**
 * USers Model to work with Objection
 *
 */
var { AppModel } = require('./AppModel');
// For hidden any field from the select query
const visibilityPlugin = require('objection-visibility');
// Import the plugin for check unique email address.

// User Model.
class EmailtemplateTable extends AppModel {
    // class User extends visibilityPlugin(AppModel) {

    constructor() {
        super();
    }

    static get hidden() {
        // return ['password'];
    }

    static get tableName() {
        return 'email_template';
    }

	/** Each model must have a column (or a set of columns) that uniquely
	*   identifies the rows. The column(s) can be specified using the `idColumn`
	*   property. `idColumn` returns `id` by default and doesn't need to be
	*   specified unless the model's primary key is something else.
	*/
    static get idColumn() {
        return 'id';
    }

    // Optional JSON schema. This is not the database schema!
    // No tables or columns are generated based on this. This is only
    // used for input validation. Whenever a model instance is created
    // either explicitly or implicitly it is checked against this schema.
    static get jsonSchema() {
        return {
            type: 'object',
            properties: {}
        };
    }
    // Get Single Data
    static async getSingleData(filter, select = "") {
        if (select != "") {
            select = select;
        } else {
            select = "*";
        }
        var getData = await EmailtemplateTable
            .query()
            .select(select)
            .where(filter)
            .first();

        return getData;
    }
}

module.exports = EmailtemplateTable;