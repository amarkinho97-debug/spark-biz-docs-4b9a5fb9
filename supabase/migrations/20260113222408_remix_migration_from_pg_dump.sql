CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_status AS ENUM (
    'draft',
    'issued',
    'processing',
    'cancelled'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    cpf,
    consents
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'cpf', NULL),
    COALESCE(NEW.raw_user_meta_data->'consents', '{}'::jsonb)
  );

  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: alert_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    email_enabled boolean DEFAULT true NOT NULL,
    webhook_url text,
    webhook_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    anonymous_id text,
    category text NOT NULL,
    action text NOT NULL,
    label text,
    metadata jsonb
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    event_type text NOT NULL,
    message text,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: automation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    execution_date date NOT NULL,
    status text NOT NULL,
    invoices_created_count integer DEFAULT 0 NOT NULL,
    error_message text,
    affected_contracts jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    alert_sent boolean DEFAULT false NOT NULL,
    alert_timestamp timestamp with time zone
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    cnpj text NOT NULL,
    razao_social text NOT NULL,
    email text,
    endereco text,
    cidade text,
    estado text,
    cep text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid,
    numero_nota text,
    descricao_servico text NOT NULL,
    valor numeric(12,2) NOT NULL,
    status public.invoice_status DEFAULT 'draft'::public.invoice_status NOT NULL,
    data_emissao timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operation_nature text,
    service_location_code text,
    retention_codes jsonb,
    xml_content text,
    external_pdf_url text,
    protocol_number text,
    discount_unconditional numeric(12,2),
    external_id text,
    error_message text,
    recurring_contract_id uuid,
    CONSTRAINT invoices_status_check CHECK (((status)::text = ANY (ARRAY['draft'::text, 'issued'::text, 'processing'::text, 'cancelled'::text])))
);


--
-- Name: nbs_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nbs_codes (
    code text NOT NULL,
    description text NOT NULL,
    category text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    razao_social text,
    cnpj text,
    email text,
    telefone text,
    endereco text,
    cidade text,
    estado text,
    cep text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    inscricao_municipal text,
    endereco_fiscal text,
    nome_fantasia text,
    numero text,
    bairro text,
    logo_url text,
    regime_tributario text,
    ibge_cidade text,
    first_name text,
    last_name text,
    cpf text,
    consents jsonb
);


--
-- Name: recurring_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    contract_name text NOT NULL,
    amount numeric NOT NULL,
    charge_day integer NOT NULL,
    service_description text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    auto_issue boolean DEFAULT true NOT NULL,
    is_vip boolean DEFAULT false NOT NULL,
    CONSTRAINT recurring_contracts_charge_day_check CHECK (((charge_day >= 1) AND (charge_day <= 31)))
);


--
-- Name: tax_service_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_service_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code_lc116 text NOT NULL,
    description text NOT NULL,
    code_nbs text,
    keywords text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alert_settings alert_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_settings
    ADD CONSTRAINT alert_settings_pkey PRIMARY KEY (id);


--
-- Name: alert_settings alert_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_settings
    ADD CONSTRAINT alert_settings_user_id_key UNIQUE (user_id);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: automation_logs automation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: nbs_codes nbs_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nbs_codes
    ADD CONSTRAINT nbs_codes_pkey PRIMARY KEY (code);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: recurring_contracts recurring_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_contracts
    ADD CONSTRAINT recurring_contracts_pkey PRIMARY KEY (id);


--
-- Name: tax_service_codes tax_service_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_service_codes
    ADD CONSTRAINT tax_service_codes_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: alert_settings set_alert_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_alert_settings_updated_at BEFORE UPDATE ON public.alert_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recurring_contracts set_recurring_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_recurring_contracts_updated_at BEFORE UPDATE ON public.recurring_contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_logs audit_logs_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: clients clients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_recurring_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_recurring_contract_id_fkey FOREIGN KEY (recurring_contract_id) REFERENCES public.recurring_contracts(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recurring_contracts recurring_contracts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_contracts
    ADD CONSTRAINT recurring_contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can read all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: analytics_events Admins can read analytics events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read analytics events" ON public.analytics_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: analytics_events Anyone can insert analytics events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events FOR INSERT WITH CHECK (true);


--
-- Name: tax_service_codes Authenticated users can read tax service codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read tax service codes" ON public.tax_service_codes FOR SELECT USING (true);


--
-- Name: nbs_codes Enable insert access for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for authenticated users" ON public.nbs_codes FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nbs_codes Enable read access for all authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all authenticated users" ON public.nbs_codes FOR SELECT TO authenticated USING (true);


--
-- Name: nbs_codes Enable update access for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update access for authenticated users" ON public.nbs_codes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: clients Users can create their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: invoices Users can create their own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own invoices" ON public.invoices FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: recurring_contracts Users can create their own recurring contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own recurring contracts" ON public.recurring_contracts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: alert_settings Users can delete their own alert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own alert settings" ON public.alert_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: clients Users can delete their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: audit_logs Users can insert audit logs for own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert audit logs for own invoices" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = audit_logs.invoice_id) AND (i.user_id = auth.uid())))));


--
-- Name: user_roles Users can insert their own admin role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own admin role" ON public.user_roles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: alert_settings Users can insert their own alert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own alert settings" ON public.alert_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: automation_logs Users can insert their own automation logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own automation logs" ON public.automation_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: user_roles Users can read their own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own role" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: alert_settings Users can update their own alert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own alert settings" ON public.alert_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: clients Users can update their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: invoices Users can update their own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own invoices" ON public.invoices FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: recurring_contracts Users can update their own recurring contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own recurring contracts" ON public.recurring_contracts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: alert_settings Users can view their own alert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own alert settings" ON public.alert_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: audit_logs Users can view their own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = audit_logs.invoice_id) AND (i.user_id = auth.uid())))));


--
-- Name: automation_logs Users can view their own automation logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own automation logs" ON public.automation_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: clients Users can view their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: invoices Users can view their own invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: recurring_contracts Users can view their own recurring contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recurring contracts" ON public.recurring_contracts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: alert_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: automation_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: nbs_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nbs_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: tax_service_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tax_service_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;