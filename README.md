# LINHARES INTELIGÊNCIA CONTÁBIL — ESCALA 5x2 • VERSÃO 3.0

## Utilização simples (sem instalar nada)

Extraia o arquivo ZIP e clique duas vezes em `ABRIR_PROGRAMA.bat` ou abra `Linhares_Escala5x2_V3_Sem_Instalar.html` no Firefox, Edge ou Chrome. Não precisa instalar Rust, Visual Studio nem SDK do Windows. A página também pode ser hospedada como HTML estático no site posteriormente.

## O que o sistema faz

1. Recebe frase em português, por exemplo: `Maria, segunda a quinta, 07:30 às 12:00 e 13:30 às 18:00; sexta, 08:00 às 12:00 e 14:00 às 18:00`.
2. Cria jornada original de 44h com o horário próprio da sexta; preserva os originais ao simular.
3. Simula jornadas de **42h** e **40h** em cinco dias, com duas folgas configuráveis e semana **A/B** opcional para revezamento.
4. Traz cálculo igual ou proporcional e alternativas para reduzir saída, adiar entrada ou dividir a redução entre entrada/saída.
5. Permite deslocar **todos** os horários (−1h, −30min, +30min, +1h); em **cada dia**, mudar o turno ou digitar entrada, intervalo inicial/final e saída livremente. O total é recalculado após sair do campo.
6. Alerta se a soma não corresponder a 42h ou 40h, se houver horário inválido, ou em situações que exigem análise jurídica.
7. Botão **PDF da simulação selecionada**: abre a impressão em paisagem de um cenário. Botão **PDF comparativo 42h e 40h**: prepara páginas separadas para cada cenário/funcionário, com tabela de horário atual vs horário proposto. Em ambos, escolha **Destino > Salvar como PDF** no navegador.
8. Continua disponível **PDF da ficha atual**, para imprimir somente os registros originais. O sistema exporta e importa as informações em `.json` e salva os dados temporariamente no navegador.

## Atenção ao revezamento

Ao marcar **Revezamento entre semanas A e B**, o programa duplica a semana A como ponto de partida para a B. Em seguida, selecione **Semana B** e altere folgas e horários. As semanas são independentes e, ao imprimir, cada semana terá uma página própria. É uma **simulação de cobertura**, não uma autorização automática de rodízio; observe CCT e intervalo entre jornadas inclusive nas mudanças entre semanas.

## Validação legal

Base normativa consultada em 29/10/2026:
- EC 141/2026, arts. 1º, 2º, 6º, 7º e 10: https://normas.leg.br/?urn=urn%3Alex%3Abr%3Afederal%3Aemenda.constitucional%3A2026-10-16%3B141
- CLT: https://www2.camara.leg.br/legin/fed/declei/1940-1949/decreto-lei-5452-1-maio-1943-415500-normaatualizada-pe.html

O software **não** substitui a avaliação da convenção/acordo coletivo, autorização para trabalho aos domingos, intervalos, regras de compensação e jornada noturna/especial (12x36 etc.). A transição para 42h (a partir de dezembro de 2026) requer cuidado específico com dias acima de 8 horas; o limite de 40h tem etapa posterior. Não modifica contratos, ponto ou eSocial por conta própria.

## Programação e publicação na web (opcional)

O projeto oferece servidor **Rust/Axum** em `src/`, servindo HTML/CSS/JS em `web/`, mas a interface trabalha localmente mesmo sem servidor. Quando o Rust estiver instalado no **servidor** de publicação (e não no computador dos clientes), execute:

```
cargo test
cargo run --release
```

Acesse `http://127.0.0.1:3000` (ou configure o domínio e HTTPS). Exemplos de Docker/nginx estão em `Dockerfile` e `deploy/`. O endpoint legado `/api/simular` **não** inclui ainda os recursos detalhados de A/B; esses recursos estão implementados no JavaScript da interface. Antes de publicar para clientes, revise CORS/HTTPS, LGPD, regras de acesso, políticas de retenção, e defina se haverá envio seguro de formulários ao escritório.

O Rust **não foi compilado neste ambiente** (Cargo indisponível). Foram executados **15 testes automatizados da lógica JavaScript**, testes de edição de horários e criação das propostas no navegador, e validação visual de um PDF de duas páginas A4 horizontal.
