'use client';

import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CalendarPlus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { ExpertRideProgramType, ExpertiseLevel } from '@/types';
import {
  useOrganizationRidePrograms,
  type CreateOrganizationProgramPayload,
} from './hooks/use-organization-ride-programs';

type LinkedTrail = { id: string; name: string; location: string | null };

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const inputClass =
  'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

type ProgramForm = Omit<CreateOrganizationProgramPayload, 'price_npr' | 'max_group_size'> & {
  price_npr: string;
  max_group_size: string;
};

const defaultValues: ProgramForm = {
  title: '',
  expert_user_id: '',
  trail_id: '',
  program_type: 'training',
  description: '',
  price_npr: '',
  max_group_size: '6',
  duration_note: '',
  meeting_point_note: '',
  availability_weekdays: [],
  available_time_note: '',
  skill_level: 'intermediate',
};

function programTypeLabel(type: ExpertRideProgramType) {
  return {
    guided_ride: 'Guided ride',
    training: 'Training',
    skills_clinic: 'Skills clinic',
    tour: 'Tour',
  }[type];
}

export default function OrganizationProgramsPanel({
  organizationId,
  trails,
}: {
  organizationId: string;
  trails: LinkedTrail[];
}) {
  const [open, setOpen] = useState(false);
  const { programs, experts, isLoading, error, createProgram, toggleProgram } =
    useOrganizationRidePrograms(organizationId);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<ProgramForm>({ defaultValues });
  const selectedExpertId = watch('expert_user_id');
  const selectedWeekdays = watch('availability_weekdays') || [];
  const selectedExpert = experts.find((expert) => expert.id === selectedExpertId);
  const eligibleTrails = useMemo(() => {
    if (!selectedExpert) return [];
    const expertTrailIds = new Set(selectedExpert.trail_ids || []);
    return trails.filter((trail) => expertTrailIds.has(trail.id));
  }, [selectedExpert, trails]);

  const submit = handleSubmit((values) => {
    createProgram.mutate(
      {
        ...values,
        price_npr: values.price_npr === '' ? null : Number(values.price_npr),
        max_group_size: Number(values.max_group_size),
      },
      {
        onSuccess: () => {
          reset(defaultValues);
          setOpen(false);
        },
      }
    );
  });

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ride programs</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Publish training, guided rides, clinics, and tours with verified team experts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
        >
          <CalendarPlus className="h-4 w-4" />
          Create program
        </button>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-gray-500 dark:text-slate-400">Loading programs...</p>
      ) : error ? (
        <p className="mt-5 text-sm text-red-700 dark:text-red-300">Failed to load programs.</p>
      ) : programs.length === 0 ? (
        <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">
          No organization programs yet.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:text-slate-400">
              <tr><th className="px-3 py-2">Program</th><th className="px-3 py-2">Expert</th><th className="px-3 py-2">Trail</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {programs.map((program) => (
                <tr key={program.id}>
                  <td className="px-3 py-3"><p className="font-semibold text-gray-900 dark:text-white">{program.title}</p><p className="text-xs text-gray-500 dark:text-slate-400">{programTypeLabel(program.program_type)}</p></td>
                  <td className="px-3 py-3 text-gray-700 dark:text-slate-300">{program.expert_name || 'Expert'}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-slate-300">{program.trail_name || 'Trail'}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${program.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'}`}>{program.is_active ? 'Active' : 'Paused'}</span></td>
                  <td className="px-3 py-3 text-right"><button type="button" disabled={toggleProgram.isPending} onClick={() => toggleProgram.mutate({ id: program.id, is_active: !program.is_active })} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">{program.is_active ? 'Pause' : 'Activate'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div><Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">Create ride program</Dialog.Title><Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">Assign a verified team expert to a linked trail they know.</Dialog.Description></div>
              <Dialog.Close className="rounded-full border border-gray-200 p-2 text-gray-600 dark:border-slate-700 dark:text-slate-300"><X className="h-4 w-4" /></Dialog.Close>
            </div>
            <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
              {experts.length === 0 && (
                <p className="md:col-span-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Add a verified expert to this organization before creating a program.
                </p>
              )}
              <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Program title<input {...register('title', { required: 'Program title is required.', maxLength: 180 })} placeholder="15 days MTB training with Nirav Shrestha" className={inputClass} />{errors.title && <span className="mt-1 block text-xs text-red-600">{errors.title.message}</span>}</label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Expert<select {...register('expert_user_id', { required: 'Select an expert.', onChange: () => setValue('trail_id', '') })} className={inputClass}><option value="">Select verified expert</option>{experts.map((expert) => <option key={expert.id} value={expert.id}>{expert.name || expert.email}</option>)}</select>{errors.expert_user_id && <span className="mt-1 block text-xs text-red-600">{errors.expert_user_id.message}</span>}</label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Trail<select {...register('trail_id', { required: 'Select a trail.' })} disabled={!selectedExpertId} className={inputClass}><option value="">{selectedExpertId ? 'Select shared trail' : 'Select expert first'}</option>{eligibleTrails.map((trail) => <option key={trail.id} value={trail.id}>{trail.name}</option>)}</select>{errors.trail_id && <span className="mt-1 block text-xs text-red-600">{errors.trail_id.message}</span>}</label>
              {selectedExpertId && eligibleTrails.length === 0 && (
                <p className="md:col-span-2 -mt-2 text-xs text-amber-700 dark:text-amber-300">
                  This expert has no trail association in common with the organization.
                </p>
              )}
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Program type<select {...register('program_type')} className={inputClass}><option value="guided_ride">Guided ride</option><option value="training">Training</option><option value="skills_clinic">Skills clinic</option><option value="tour">Tour</option></select></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Skill level<select {...register('skill_level')} className={inputClass}>{(['beginner', 'intermediate', 'advanced', 'expert'] as ExpertiseLevel[]).map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Duration<input {...register('duration_note')} placeholder="15 days" className={inputClass} /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Group size<input type="number" min={1} max={50} {...register('max_group_size', { required: true })} className={inputClass} /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Price in NPR<input type="number" min={0} {...register('price_npr')} placeholder="Optional" className={inputClass} /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Meeting point<input {...register('meeting_point_note')} placeholder="Confirm after acceptance" className={inputClass} /></label>
              <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Description<textarea rows={4} {...register('description')} className={inputClass} /></label>
              <fieldset className="md:col-span-2"><legend className="text-sm font-semibold text-gray-700 dark:text-slate-200">Available weekdays</legend><div className="mt-2 flex flex-wrap gap-2">{WEEKDAYS.map((day) => <label key={day} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedWeekdays.includes(day) ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-gray-300 text-gray-600 dark:border-slate-700 dark:text-slate-300'}`}><input type="checkbox" value={day} {...register('availability_weekdays')} className="sr-only" />{day.slice(0, 3)}</label>)}</div></fieldset>
              <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Available time note<input {...register('available_time_note')} placeholder="Early mornings or weekends" className={inputClass} /></label>
              {createProgram.error && <p className="md:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{createProgram.error.message}</p>}
              <div className="md:col-span-2 flex justify-end gap-2"><Dialog.Close type="button" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-slate-700 dark:text-slate-200">Cancel</Dialog.Close><button type="submit" disabled={createProgram.isPending || experts.length === 0} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-950">{createProgram.isPending ? 'Creating...' : 'Publish program'}</button></div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
