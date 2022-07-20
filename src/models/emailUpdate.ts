import AbstractModel from './abstractModel'

interface IEmailUpdate {
	newEmail: string
	password: string
}

export default class EmailUpdateModel extends AbstractModel implements IEmailUpdate {
	declare newEmail: string
	declare password: string

	defaults() {
		return {
			newEmail: '',
			password: '',
		}
	}
}