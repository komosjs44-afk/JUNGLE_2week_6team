import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventService } from '@/services'
import type { NewEventEntryInput } from '@/types'

export function useCurrentEvent() {
  return useQuery({
    queryKey: ['event', 'current'],
    queryFn: () => eventService.getCurrent(),
  })
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getById(id as string),
    enabled: !!id,
  })
}

export function useEventEntries(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id, 'entries'],
    queryFn: () => eventService.listEntries(id as string),
    enabled: !!id,
  })
}

export function useMyEventEntry(eventId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId, 'my-entry', userId],
    queryFn: () => eventService.getMyEntry(eventId as string, userId as string),
    enabled: !!eventId && !!userId,
  })
}

export function useMyEventVotes(eventId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId, 'my-votes', userId],
    queryFn: () => eventService.listMyVoteEntryIds(eventId as string, userId as string),
    enabled: !!eventId && !!userId,
  })
}

export function useEventResult(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id, 'result'],
    queryFn: () => eventService.getResult(id as string),
    enabled: !!id,
  })
}

export function useSubmitEventEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewEventEntryInput) => eventService.submitEntry(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['event', input.eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['leaf'] })
    },
  })
}

interface VoteVariables {
  eventId: string
  entryId: string
  userId: string
}

export function useVoteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, entryId, userId }: VoteVariables) =>
      eventService.vote(eventId, entryId, userId),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    },
  })
}
