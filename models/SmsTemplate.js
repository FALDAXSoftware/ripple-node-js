var {
    AppModel
} = require('./AppModel');

const visibilityPlugin = require('objection-visibility');

class SmsTemplate extends visibilityPlugin((AppModel)) {

    constructor() {
        super();
    }

    static get hidden() {
        return ['id'];
    }

    static get tableName() {
        return 'sms_template';
    }

    /** Each model must have a column (or a set of columns) that uniquely
     *   identifies the rows. The column(s) can be specified using the `idColumn`
     *   property. `idColumn` returns `id` by default and doesn't need to be
     *   specified unless the model's primary key is something else.
     */
    static get idColumn() {
        return 'id';
    }

    static get virtualAttributes() {

        return ['encript_id'];
    }

    encript_id() {

        if (this.id) {
            return cryptr.encrypt(this.id);
        }
    }

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

    /** Optional JSON schema. This is not the database schema!
     *   Nothing is generated based on this. This is only used
     *   for input validation. Whenever a model instance is created
     *   either explicitly or implicitly it is checked against this schema.
     *   http://json-schema.org/.
     */
    static get jsonSchema() {

        return {
            type: 'object',
            required: [],
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
        var getData = await SmsTemplate
            .query()
            .select(select)
            .where(filter)
            .first();

        return getData;
    }
}

module.exports = SmsTemplate;