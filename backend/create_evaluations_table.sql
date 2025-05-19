-- Create evaluations table
create table public.evaluations (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id text not null,
    question_number integer not null,
    transcription_id uuid references public.transcriptions(id),
    evaluation jsonb not null,
    
    -- Enable row level security
    constraint evaluations_user_id_fkey foreign key (user_id) references auth.users(id)
);

-- Enable row level security
alter table public.evaluations enable row level security;

-- Create policy to allow users to read their own evaluations
create policy "Users can read their own evaluations"
    on public.evaluations
    for select
    using (auth.uid() = user_id);

-- Create policy to allow the service role to insert evaluations
create policy "Service role can insert evaluations"
    on public.evaluations
    for insert
    with check (true);

-- Enable realtime
alter publication supabase_realtime add table public.evaluations; 