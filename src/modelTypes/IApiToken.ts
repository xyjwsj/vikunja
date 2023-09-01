import type {IAbstract} from '@/modelTypes/IAbstract'

export interface IApiPermission {
	[key: string]: string[]
}

export interface IApiToken extends IAbstract {
	id: number
	token: string
	permissions: IApiPermission
	expiresAt: Date
	created: Date
}
