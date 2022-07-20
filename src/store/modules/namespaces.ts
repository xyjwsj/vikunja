import type {ActionContext} from 'vuex'

import NamespaceService from '../../services/namespace'
import {setLoading} from '@/store/helper'
import {createNewIndexer} from '@/indexes'
import type {NamespaceState, RootStoreState} from '@/store/types'
import type {INamespace} from '@/models/namespace'
import type {IList} from '@/models/list'

const {add, remove, search, update} = createNewIndexer('namespaces', ['title', 'description'])

export default {
	namespaced: true,
	state: (): NamespaceState => ({
		namespaces: [],
	}),
	mutations: {
		namespaces(state: NamespaceState, namespaces: INamespace[]) {
			state.namespaces = namespaces
			namespaces.forEach(n => {
				add(n)
			})
		},
		setNamespaceById(state: NamespaceState, namespace: INamespace) {
			const namespaceIndex = state.namespaces.findIndex(n => n.id === namespace.id)

			if (namespaceIndex === -1) {
				return
			}

			if (!namespace.lists || namespace.lists.length === 0) {
				namespace.lists = state.namespaces[namespaceIndex].lists
			}

			state.namespaces[namespaceIndex] = namespace
			update(namespace)
		},
		setListInNamespaceById(state: NamespaceState, list: IList) {
			for (const n in state.namespaces) {
				// We don't have the namespace id on the list which means we need to loop over all lists until we find it.
				// FIXME: Not ideal at all - we should fix that at the api level.
				if (state.namespaces[n].id === list.namespaceId) {
					for (const l in state.namespaces[n].lists) {
						if (state.namespaces[n].lists[l].id === list.id) {
							const namespace = state.namespaces[n]
							namespace.lists[l] = list
							state.namespaces[n] = namespace
							return
						}
					}
				}
			}
		},
		addNamespace(state: NamespaceState, namespace: INamespace) {
			state.namespaces.push(namespace)
			add(namespace)
		},
		removeNamespaceById(state: NamespaceState, namespaceId: INamespace['id']) {
			for (const n in state.namespaces) {
				if (state.namespaces[n].id === namespaceId) {
					remove(state.namespaces[n])
					state.namespaces.splice(n, 1)
					return
				}
			}
		},
		addListToNamespace(state: NamespaceState, list: IList) {
			for (const n in state.namespaces) {
				if (state.namespaces[n].id === list.namespaceId) {
					state.namespaces[n].lists.push(list)
					return
				}
			}
		},
		removeListFromNamespaceById(state: NamespaceState, list: IList) {
			for (const n in state.namespaces) {
				// We don't have the namespace id on the list which means we need to loop over all lists until we find it.
				// FIXME: Not ideal at all - we should fix that at the api level.
				if (state.namespaces[n].id === list.namespaceId) {
					for (const l in state.namespaces[n].lists) {
						if (state.namespaces[n].lists[l].id === list.id) {
							state.namespaces[n].lists.splice(l, 1)
							return
						}
					}
				}
			}
		},
	},
	getters: {
		getListAndNamespaceById: (state: NamespaceState) => (listId: IList['id'], ignorePseudoNamespaces = false) => {
			for (const n in state.namespaces) {

				if (ignorePseudoNamespaces && state.namespaces[n].id < 0) {
					continue
				}

				for (const l in state.namespaces[n].lists) {
					if (state.namespaces[n].lists[l].id === listId) {
						return {
							list: state.namespaces[n].lists[l],
							namespace: state.namespaces[n],
						}
					}
				}
			}
			return null
		},
		getNamespaceById: (state: NamespaceState) => (namespaceId: INamespace['id']) => {
			return state.namespaces.find(({id}) => id == namespaceId) || null
		},
		searchNamespace: (state: NamespaceState, getters) => (query: string) => {
			return search(query)
					?.filter(value => value > 0)
					.map(getters.getNamespaceById)
					.filter(n => n !== null)
				|| []
		},
	},
	actions: {
		async loadNamespaces(ctx: ActionContext<NamespaceState, RootStoreState>) {
			const cancel = setLoading(ctx, 'namespaces')

			const namespaceService = new NamespaceService()
			try {
				// We always load all namespaces and filter them on the frontend
				const namespaces = await namespaceService.getAll({}, {is_archived: true})
				ctx.commit('namespaces', namespaces)

				// Put all lists in the list state
				const lists = namespaces.flatMap(({lists}) => lists)

				ctx.commit('lists/setLists', lists, {root: true})

				return namespaces
			} finally {
				cancel()
			}
		},

		loadNamespacesIfFavoritesDontExist(ctx: ActionContext<NamespaceState, RootStoreState>) {
			// The first or second namespace should be the one holding all favorites
			if (ctx.state.namespaces[0].id !== -2 && ctx.state.namespaces[1]?.id !== -2) {
				return ctx.dispatch('loadNamespaces')
			}
		},

		removeFavoritesNamespaceIfEmpty(ctx: ActionContext<NamespaceState, RootStoreState>) {
			if (ctx.state.namespaces[0].id === -2 && ctx.state.namespaces[0].lists.length === 0) {
				ctx.state.namespaces.splice(0, 1)
			}
		},

		async deleteNamespace(ctx: ActionContext<NamespaceState, RootStoreState>, namespace: INamespace) {
			const cancel = setLoading(ctx, 'namespaces')
			const namespaceService = new NamespaceService()

			try {
				const response = await namespaceService.delete(namespace)
				ctx.commit('removeNamespaceById', namespace.id)
				return response
			} finally {
				cancel()
			}
		},

		async createNamespace(ctx: ActionContext<NamespaceState, RootStoreState>, namespace: INamespace) {
			const cancel = setLoading(ctx, 'namespaces')
			const namespaceService = new NamespaceService()

			try {
				const createdNamespace = await namespaceService.create(namespace)
				ctx.commit('addNamespace', createdNamespace)
				return createdNamespace
			} finally {
				cancel()
			}
		},
	},
}