-- ============================================================
-- LABORATÓRIO — Triggers de sincronização da biblioteca_index
-- e políticas de RLS (single-user: authenticated tem acesso total)
-- ============================================================

alter table biblioteca_index
  add constraint uq_biblioteca_origem unique (tipo_origem, origem_id);

-- ------------------------------------------------------------
-- tsvector da biblioteca_index
-- ------------------------------------------------------------
create or replace function biblioteca_index_set_busca()
returns trigger as $$
begin
  new.busca :=
    setweight(to_tsvector('portuguese', coalesce(new.titulo, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(new.resumo, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(new.resultado_resumo, '')), 'C') ||
    setweight(to_tsvector('portuguese', array_to_string(coalesce(new.tags, '{}'), ' ')), 'B');
  return new;
end;
$$ language plpgsql;

create trigger trg_biblioteca_set_busca
  before insert or update on biblioteca_index
  for each row execute function biblioteca_index_set_busca();

-- ------------------------------------------------------------
-- helper de upsert genérico
-- ------------------------------------------------------------
create or replace function biblioteca_upsert(
  p_tipo_origem text,
  p_origem_id uuid,
  p_cliente_id uuid,
  p_nicho_id uuid,
  p_titulo text,
  p_resumo text,
  p_tags text[],
  p_resultado_resumo text
) returns void as $$
begin
  insert into biblioteca_index (tipo_origem, origem_id, cliente_id, nicho_id, titulo, resumo, tags, resultado_resumo)
  values (p_tipo_origem, p_origem_id, p_cliente_id, p_nicho_id, p_titulo, p_resumo, coalesce(p_tags, '{}'), p_resultado_resumo)
  on conflict (tipo_origem, origem_id) do update set
    cliente_id = excluded.cliente_id,
    nicho_id = excluded.nicho_id,
    titulo = excluded.titulo,
    resumo = excluded.resumo,
    tags = excluded.tags,
    resultado_resumo = excluded.resultado_resumo;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- pesquisas → biblioteca_index
-- ------------------------------------------------------------
create or replace function sync_biblioteca_pesquisa()
returns trigger as $$
declare
  v_cliente_id uuid;
begin
  select cliente_id into v_cliente_id from nichos where id = new.nicho_id;
  perform biblioteca_upsert(
    'pesquisa', new.id, v_cliente_id, new.nicho_id,
    coalesce(new.titulo, 'Pesquisa ' || new.tipo),
    new.resumo,
    array[new.tipo, new.origem]::text[],
    new.status
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_biblioteca_pesquisa
  after insert or update on pesquisas
  for each row execute function sync_biblioteca_pesquisa();

-- ------------------------------------------------------------
-- briefings → biblioteca_index
-- ------------------------------------------------------------
create or replace function sync_biblioteca_briefing()
returns trigger as $$
declare
  v_cliente_id uuid;
begin
  select cliente_id into v_cliente_id from nichos where id = new.nicho_id;
  perform biblioteca_upsert(
    'briefing', new.id, v_cliente_id, new.nicho_id,
    new.titulo,
    new.contexto_mercado,
    array['briefing']::text[],
    new.status
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_biblioteca_briefing
  after insert or update on briefings
  for each row execute function sync_biblioteca_briefing();

-- ------------------------------------------------------------
-- copies → biblioteca_index
-- ------------------------------------------------------------
create or replace function sync_biblioteca_copy()
returns trigger as $$
declare
  v_cliente_id uuid;
begin
  select cliente_id into v_cliente_id from nichos where id = new.nicho_id;
  perform biblioteca_upsert(
    'copy', new.id, v_cliente_id, new.nicho_id,
    new.titulo,
    left(new.conteudo, 280),
    array[new.tipo, new.modo]::text[],
    new.status
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_biblioteca_copy
  after insert or update on copies
  for each row execute function sync_biblioteca_copy();

-- ------------------------------------------------------------
-- criativos → biblioteca_index (com última métrica disponível)
-- ------------------------------------------------------------
create or replace function sync_biblioteca_criativo()
returns trigger as $$
declare
  v_cliente_id uuid;
  v_roas numeric;
  v_cpl numeric;
  v_resultado text;
begin
  select cliente_id into v_cliente_id from nichos where id = new.nicho_id;
  select roas, cpl into v_roas, v_cpl
    from metricas
    where criativo_id = new.id
    order by periodo_fim desc nulls last, criado_em desc
    limit 1;
  v_resultado := trim(both ' · ' from
    coalesce('ROAS ' || v_roas::text, '') ||
    case when v_roas is not null and v_cpl is not null then ' · ' else '' end ||
    coalesce('CPL R$ ' || v_cpl::text, '')
  );
  if v_resultado = '' then
    v_resultado := new.status;
  end if;
  perform biblioteca_upsert(
    'criativo', new.id, v_cliente_id, new.nicho_id,
    new.nome_criativo,
    concat_ws(' · ', new.angulo, new.formato),
    array_remove(array[new.angulo, new.formato, new.status]::text[], null),
    v_resultado
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_biblioteca_criativo
  after insert or update on criativos
  for each row execute function sync_biblioteca_criativo();

-- também resincroniza o criativo quando uma métrica nova chega
create or replace function sync_biblioteca_criativo_via_metrica()
returns trigger as $$
declare
  v_criativo criativos%rowtype;
begin
  select * into v_criativo from criativos where id = new.criativo_id;
  if found then
    perform sync_biblioteca_criativo_from_row(v_criativo);
  end if;
  return new;
end;
$$ language plpgsql;

-- wrapper necessário porque o trigger acima referencia a linha, não NEW de criativos
create or replace function sync_biblioteca_criativo_from_row(c criativos)
returns void as $$
declare
  v_cliente_id uuid;
  v_roas numeric;
  v_cpl numeric;
  v_resultado text;
begin
  select cliente_id into v_cliente_id from nichos where id = c.nicho_id;
  select roas, cpl into v_roas, v_cpl
    from metricas
    where criativo_id = c.id
    order by periodo_fim desc nulls last, criado_em desc
    limit 1;
  v_resultado := trim(both ' · ' from
    coalesce('ROAS ' || v_roas::text, '') ||
    case when v_roas is not null and v_cpl is not null then ' · ' else '' end ||
    coalesce('CPL R$ ' || v_cpl::text, '')
  );
  if v_resultado = '' then
    v_resultado := c.status;
  end if;
  perform biblioteca_upsert(
    'criativo', c.id, v_cliente_id, c.nicho_id,
    c.nome_criativo,
    concat_ws(' · ', c.angulo, c.formato),
    array_remove(array[c.angulo, c.formato, c.status]::text[], null),
    v_resultado
  );
end;
$$ language plpgsql;

create trigger trg_sync_biblioteca_criativo_via_metrica
  after insert or update on metricas
  for each row execute function sync_biblioteca_criativo_via_metrica();

-- ------------------------------------------------------------
-- padroes → biblioteca_index
-- ------------------------------------------------------------
create or replace function sync_biblioteca_padrao()
returns trigger as $$
declare
  v_cliente_id uuid;
begin
  select cliente_id into v_cliente_id from nichos where id = new.nicho_id;
  perform biblioteca_upsert(
    'padrao', new.id, v_cliente_id, new.nicho_id,
    initcap(new.tipo) || ': ' || left(new.descricao, 80),
    new.porque_funciona,
    array[new.tipo, new.forca_evidencia, new.potencial_teste]::text[],
    'evidência ' || new.forca_evidencia || ' · freq ' || new.frequencia::text
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_biblioteca_padrao
  after insert or update on padroes
  for each row execute function sync_biblioteca_padrao();

-- ------------------------------------------------------------
-- aprendizados → biblioteca_index
-- ------------------------------------------------------------
create or replace function sync_biblioteca_aprendizado()
returns trigger as $$
declare
  v_cliente_id uuid;
begin
  if new.nicho_id is not null then
    select cliente_id into v_cliente_id from nichos where id = new.nicho_id;
  end if;
  perform biblioteca_upsert(
    'aprendizado', new.id, v_cliente_id, new.nicho_id,
    initcap(new.escopo) || ' · ' || initcap(new.tipo) || ': ' || left(new.afirmacao, 80),
    new.porque,
    array_remove(array[new.escopo, new.tipo, new.categoria]::text[], null),
    'confiança ' || round(new.confianca * 100)::text || '% · ' || new.n_amostras::text || ' amostras'
  );
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_biblioteca_aprendizado
  after insert or update on aprendizados
  for each row execute function sync_biblioteca_aprendizado();

-- ============================================================
-- Row Level Security — single-user: authenticated acessa tudo
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'clientes', 'nichos', 'avatares', 'avatar_nicho', 'concorrentes',
    'anuncios_espionados', 'pesquisas', 'fontes_pesquisa', 'padroes',
    'briefings', 'levas', 'hipoteses', 'copies', 'criativos',
    'importacoes', 'metricas', 'aprendizados', 'sugestoes',
    'aprovacoes', 'jobs', 'biblioteca_index'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy "authenticated_full_access" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
