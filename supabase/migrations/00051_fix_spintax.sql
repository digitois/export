-- ------------------------------------------------------------------
-- Export OS - 00051: Fix parse_spintax infinite loop
--
-- The 00047 parse_spintax could loop forever on malformed input.
-- Replace with a bounded, simpler implementation.
-- ------------------------------------------------------------------

create or replace function public.parse_spintax(p_pattern text)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result text[] := array[''];
  v_remaining text := p_pattern;
  v_pos int;
  v_close int;
  v_options text[];
  v_prefix text;
  v_suffix text;
  v_new text[];
  v_i int;
  v_j int;
  v_guard int := 0;
begin
  while position('{' in v_remaining) > 0 loop
    v_guard := v_guard + 1;
    if v_guard > 50 then return array[p_pattern]; end if;

    v_pos := position('{' in v_remaining);
    v_close := position('}' in substring(v_remaining from v_pos + 1));
    if v_close = 0 then return array[p_pattern]; end if;

    v_close := v_pos + v_close;
    v_options := string_to_array(substring(v_remaining from v_pos + 1 for v_close - v_pos - 1), '|');
    v_prefix := substring(v_remaining from 1 for v_pos - 1);
    v_suffix := substring(v_remaining from v_close + 1);

    v_new := array[]::text[];
    for v_i in 1..array_length(v_result, 1) loop
      for v_j in 1..array_length(v_options, 1) loop
        v_new := v_new || (v_result[v_i] || v_prefix || v_options[v_j]);
      end loop;
    end loop;

    v_result := v_new;
    v_remaining := v_suffix;
  end loop;

  if array_length(v_result, 1) = 1 and v_result[1] = p_pattern then
    return array[p_pattern];
  end if;

  -- Append any trailing static text to all combinations
  for v_i in 1..array_length(v_result, 1) loop
    v_result[v_i] := v_result[v_i] || v_remaining;
  end loop;

  return v_result;
exception
  when others then return array[p_pattern];
end;
$$;

grant execute on function public.parse_spintax(text) to authenticated, service_role;