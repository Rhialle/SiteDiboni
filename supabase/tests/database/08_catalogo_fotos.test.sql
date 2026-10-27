begin;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'dona@loja.test'),
  ('00000000-0000-0000-0000-00000000000b', 'func@loja.test');

select is((select public from storage.buckets where id = 'fotos-produtos'), true, 'fotos são públicas para leitura');
select is((select file_size_limit from storage.buckets where id = 'fotos-produtos'), 5242880::bigint, 'até 5 MB');
select is((select allowed_mime_types from storage.buckets where id = 'fotos-produtos'),
  array['image/jpeg', 'image/png', 'image/webp'], 'JPG, PNG ou WebP');

select tests.entrar_como('00000000-0000-0000-0000-00000000000a', 'aal2');
create temp table ids (nome text primary key, id uuid);
insert into ids select 'caixa', criar_produto('{"nome":"Caixa","tipo_venda":"unidade"}');

insert into fotos (produto_id, caminho, ordem)
  select (select id from ids where nome = 'caixa'), 'caixa/' || n || '.jpg', n from generate_series(1, 8) as n;
select throws_ok(
  $$insert into fotos (produto_id, caminho) values ((select id from ids where nome = 'caixa'), 'caixa/9.jpg')$$,
  'P0001', 'Cada produto pode ter até 8 fotos.', 'a 9ª foto é recusada');

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos-produtos', 'teste/administradora.jpg')$$,
  'administradora envia arquivo');

select tests.entrar_como('00000000-0000-0000-0000-00000000000b', 'aal1');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos-produtos', 'teste/funcionaria.jpg')$$,
  '42501', null, 'funcionária não envia arquivo');
select is((select count(*) from fotos), 8::bigint, 'funcionária vê as fotos');

select * from finish();
rollback;
